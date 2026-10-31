/**
 * audioCapture.js
 * Captures microphone audio stream via Web Audio API, downsamples to 16kHz PCM mono,
 * and emits audio chunks as base64-encoded strings for backend STT compatibility.
 */

/**
 * Resamples a Float32Array from inputSampleRate to outputSampleRate
 * @param {Float32Array} buffer
 * @param {number} inputSampleRate
 * @param {number} outputSampleRate
 * @returns {Float32Array}
 */
export function downsampleBuffer(buffer, inputSampleRate, outputSampleRate = 16000) {
    if (!buffer || buffer.length === 0) return new Float32Array(0);
    if (outputSampleRate === inputSampleRate) {
        return buffer;
    }
    if (outputSampleRate > inputSampleRate) {
        return buffer;
    }

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }

    return result;
}

/**
 * Converts Float32Array [-1.0, 1.0] to 16-bit linear PCM ArrayBuffer (little-endian)
 * @param {Float32Array} float32Array
 * @returns {ArrayBuffer}
 */
export function floatTo16BitPCM(float32Array) {
    if (!float32Array) return new ArrayBuffer(0);
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

/**
 * Converts an ArrayBuffer to a base64 string
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
    if (!buffer || buffer.byteLength === 0) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
        return window.btoa(binary);
    }
    return Buffer.from(binary, 'binary').toString('base64');
}

/**
 * Converts a base64 string to an ArrayBuffer
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
export function base64ToArrayBuffer(base64) {
    if (!base64) return new ArrayBuffer(0);
    let binaryString;
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        binaryString = window.atob(base64);
    } else {
        binaryString = Buffer.from(base64, 'base64').toString('binary');
    }
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * AudioCapture class: manages microphone stream, AudioContext, downsampling,
 * and emits base64 chunks.
 */
export class AudioCapture {
    constructor(options = {}) {
        this.targetSampleRate = options.targetSampleRate || 16000;
        this.bufferSize = options.bufferSize || 4096; // buffer size for script processor
        this.chunkIntervalMs = options.chunkIntervalMs || 250; // chunk dispatch interval
        this.onAudioChunk = options.onAudioChunk || (() => {});
        this.onError = options.onError || (() => {});
        this.isCapturing = false;

        this.stream = null;
        this.audioContext = null;
        this.sourceNode = null;
        this.processorNode = null;
        this._pendingPCMChunks = [];
        this._dispatchTimer = null;
    }

    /**
     * Start capturing audio from the microphone
     */
    async start() {
        if (this.isCapturing) return;

        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const err = new Error('navigator.mediaDevices.getUserMedia is not supported');
            this.onError(err);
            throw err;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const AudioContextClass = typeof window !== 'undefined'
                ? (window.AudioContext || window.webkitAudioContext)
                : null;

            if (!AudioContextClass) {
                throw new Error('Web Audio API (AudioContext) is not supported');
            }

            this.audioContext = new AudioContextClass();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

            // Using createScriptProcessor for broad cross-browser support and PCM extraction
            this.processorNode = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);

            this.processorNode.onaudioprocess = (e) => {
                if (!this.isCapturing) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const inputSampleRate = this.audioContext.sampleRate;

                // Downsample to 16kHz
                const downsampled = downsampleBuffer(inputData, inputSampleRate, this.targetSampleRate);
                const pcmBuffer = floatTo16BitPCM(downsampled);
                this._pendingPCMChunks.push(pcmBuffer);
            };

            // Connect graph: source -> processor -> destination (muted or dummy)
            this.sourceNode.connect(this.processorNode);
            this.processorNode.connect(this.audioContext.destination);

            this.isCapturing = true;

            // Timer to flush pending PCM chunks periodically as a unified chunk
            this._dispatchTimer = setInterval(() => {
                this._flushPendingChunks();
            }, this.chunkIntervalMs);

        } catch (err) {
            this.stop();
            this.onError(err);
            throw err;
        }
    }

    _flushPendingChunks() {
        if (this._pendingPCMChunks.length === 0) return;

        // Calculate total byte length
        let totalBytes = 0;
        for (const buf of this._pendingPCMChunks) {
            totalBytes += buf.byteLength;
        }

        const combined = new Uint8Array(totalBytes);
        let offset = 0;
        for (const buf of this._pendingPCMChunks) {
            combined.set(new Uint8Array(buf), offset);
            offset += buf.byteLength;
        }
        this._pendingPCMChunks = [];

        const base64 = arrayBufferToBase64(combined.buffer);
        if (base64 && this.isCapturing) {
            this.onAudioChunk({
                data: base64,
                base64,
                sampleRate: this.targetSampleRate,
                byteLength: totalBytes
            });
        }
    }

    /**
     * Stop capturing and release microphone and Web Audio resources
     */
    stop() {
        this.isCapturing = false;

        if (this._dispatchTimer) {
            clearInterval(this._dispatchTimer);
            this._dispatchTimer = null;
        }

        // Flush remaining chunks
        this._flushPendingChunks();

        if (this.processorNode) {
            try {
                this.processorNode.disconnect();
                this.processorNode.onaudioprocess = null;
            } catch {}
            this.processorNode = null;
        }

        if (this.sourceNode) {
            try {
                this.sourceNode.disconnect();
            } catch {}
            this.sourceNode = null;
        }

        if (this.audioContext) {
            try {
                if (this.audioContext.state !== 'closed') {
                    this.audioContext.close();
                }
            } catch {}
            this.audioContext = null;
        }

        if (this.stream) {
            try {
                this.stream.getTracks().forEach(track => track.stop());
            } catch {}
            this.stream = null;
        }
    }
}

/**
 * Functional helper to initiate audio capture
 */
export async function startAudioCapture(options = {}) {
    const capture = new AudioCapture(options);
    await capture.start();
    return capture;
}

export default AudioCapture;
