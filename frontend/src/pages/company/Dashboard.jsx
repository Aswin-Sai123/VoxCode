import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const Dashboard = () => {
    const [roles, setRoles] = useState([]);
    const [newRole, setNewRole] = useState({ title: '', description: '' });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await api.get('/company/roles');
            setRoles(res.data);
        } catch (error) {
            console.error('Failed to fetch roles', error);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        try {
            await api.post('/company/roles', newRole);
            setNewRole({ title: '', description: '' });
            fetchRoles();
        } catch (error) {
            console.error('Failed to create role', error);
        }
    };

    const handleDeleteRole = async (id) => {
        try {
            await api.delete(`/company/roles/${id}`);
            fetchRoles();
        } catch (error) {
            console.error('Failed to delete role', error);
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Company Dashboard</h1>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
                    <h2>Roles</h2>
                    <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                        <input type="text" placeholder="Role Title (e.g. Software Developer)" value={newRole.title} onChange={(e) => setNewRole({ ...newRole, title: e.target.value })} required style={{ padding: '0.5rem' }} />
                        <textarea placeholder="Description" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} style={{ padding: '0.5rem' }} />
                        <button type="submit" style={{ padding: '0.5rem', background: '#007BFF', color: 'white', border: 'none', cursor: 'pointer' }}>Create Role</button>
                    </form>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {roles.map(role => (
                            <li key={role._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                                <span>{role.title}</span>
                                <button onClick={() => handleDeleteRole(role._id)} style={{ background: 'red', color: 'white', border: 'none', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>Delete</button>
                            </li>
                        ))}
                    </ul>
                </div>
                
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', opacity: 0.7 }}>
                    <h2>Future Modules (Placeholders)</h2>
                    <ul style={{ lineHeight: '2' }}>
                        <li>Assessments</li>
                        <li>Candidates</li>
                        <li>Interviews</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
