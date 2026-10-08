import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Company Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Welcome back, {user?.name}
                    </p>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4">
                    <button type="button" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Create New Assessment
                    </button>
                </div>
            </div>

            {/* Placeholder Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Roles</dt>
                                    <dd className="text-lg font-medium text-gray-900">0</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Active Assessments</dt>
                                    <dd className="text-lg font-medium text-gray-900">0</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Candidates Evaluated</dt>
                                    <dd className="text-lg font-medium text-gray-900">0</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Placeholder Sections */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 mb-8 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Assessments (Coming Soon)</h3>
                <div className="border-2 border-dashed border-gray-200 rounded-lg h-32 flex items-center justify-center">
                    <span className="text-gray-500">Module 2 feature placeholder</span>
                </div>
            </div>
            
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Roles (Coming Soon)</h3>
                <div className="border-2 border-dashed border-gray-200 rounded-lg h-32 flex items-center justify-center">
                    <span className="text-gray-500">Role management UI placeholder</span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
