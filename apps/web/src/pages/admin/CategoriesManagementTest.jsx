import React, { useState, useEffect } from 'react';
import client from '@/lib/apiClient';

const CategoriesManagementTest = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log('Starting fetch...');
                const response = await client.fetch('/categories', 'GET');
                console.log('Response:', response);
                setData(response);
            } catch (err) {
                console.error('Error:', err);
                setError(err.message || String(err));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-8">Loading...</div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Categories Test</h1>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
};

export default CategoriesManagementTest;
