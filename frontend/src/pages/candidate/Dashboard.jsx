import React, { useState } from 'react';

const Dashboard = () => {
    const [assessmentId, setAssessmentId] = useState('');

    const handleJoinAssessment = (e) => {
        e.preventDefault();
        alert(`Joining assessment ${assessmentId} (Module 2+ functionality)`);
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Candidate Dashboard</h1>
            
            <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
                    <h2>Real Assessment</h2>
                    <form onSubmit={handleJoinAssessment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <input 
                            type="text" 
                            placeholder="Enter Assessment ID" 
                            value={assessmentId} 
                            onChange={(e) => setAssessmentId(e.target.value)} 
                            required 
                            style={{ padding: '0.5rem' }} 
                        />
                        <button type="submit" style={{ padding: '0.5rem', background: '#28A745', color: 'white', border: 'none', cursor: 'pointer' }}>
                            Join Assessment
                        </button>
                    </form>
                </div>

                <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', opacity: 0.7 }}>
                    <h2>Practice Mock Interview</h2>
                    <button style={{ marginTop: '1rem', padding: '0.5rem', background: '#6c757d', color: 'white', border: 'none', cursor: 'not-allowed', width: '100%' }} disabled>
                        Start Practice (Coming Soon)
                    </button>
                    
                    <h3 style={{ marginTop: '2rem' }}>Future Modules (Placeholders)</h3>
                    <ul style={{ lineHeight: '2' }}>
                        <li>AI Interview</li>
                        <li>Coding Round</li>
                        <li>Reports</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
