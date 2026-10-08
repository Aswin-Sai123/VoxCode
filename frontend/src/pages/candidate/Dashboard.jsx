import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Candidate Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Ready to ace your next technical interview, {user?.name}?
                    </p>
                </div>
            </div>

            {/* Assessment Entry */}
            <div className="bg-white shadow-xl shadow-indigo-100/10 rounded-2xl border border-indigo-50 mb-8 p-8 max-w-2xl mx-auto text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Join an Assessment</h3>
                <p className="text-gray-500 mb-6">Enter the Assessment ID provided by the company to begin your AI interview.</p>
                
                <div className="flex max-w-md mx-auto gap-3">
                    <input
                        type="text"
                        placeholder="e.g. ASMT-1234-5678"
                        className="flex-1 appearance-none block px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary transition-colors text-center font-mono text-lg tracking-wider"
                    />
                    <button type="button" className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                        Join
                    </button>
                </div>
            </div>

            {/* Practice Options Placeholder */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-12">
                <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 opacity-75 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-500 uppercase tracking-wider shadow-sm">Coming Soon</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Practice Mock Interview</h3>
                    <p className="text-gray-500 text-sm mb-4">Sharpen your skills with our AI interviewer before the real thing. Get instant feedback on your answers.</p>
                    <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium">Start Practice</button>
                </div>
                
                <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 opacity-75 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-500 uppercase tracking-wider shadow-sm">Coming Soon</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">My Reports</h3>
                    <p className="text-gray-500 text-sm mb-4">View your past interview performances, coding evaluations, and AI feedback to improve your skills.</p>
                    <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium">View Reports</button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
