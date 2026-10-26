import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('Uncaught React render error caught by ErrorBoundary:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDF0] flex flex-col items-center justify-center p-6 selection:bg-blue-600/30">
                    <div className="fixed inset-0 bg-architectural-grid pointer-events-none z-0" />
                    <div className="max-w-md w-full bg-[#141419] border border-[#232330] rounded-2xl p-8 space-y-6 text-center relative z-10 shadow-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                            <AlertTriangle className="w-7 h-7" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-xl font-bold tracking-tight text-[#EDEDF0]">
                                Something went wrong
                            </h1>
                            <p className="text-xs text-[#8B8B9E] leading-relaxed">
                                The application encountered an unexpected runtime error. Your interview progress and saved data are protected.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="p-3 bg-[#0A0A0B] border border-[#232330] rounded-xl text-left overflow-hidden">
                                <p className="text-[11px] font-mono text-red-400 break-words line-clamp-3">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                            <button
                                onClick={this.handleReload}
                                className="w-full btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reload Application</span>
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="w-full studio-btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
                            >
                                <Home className="w-3.5 h-3.5" />
                                <span>Go to Home</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
