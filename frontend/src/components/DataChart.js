// frontend/src/components/DataChart.js
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { io } from 'socket.io-client';

function DataChart({ deviceId, field }) {
    const [data, setData] = useState({
        labels: [],
        datasets: [{
            label: field,
            data: [],
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    });

    useEffect(() => {
        const socket = io();
        
        socket.emit('subscribe', deviceId);
        
        socket.on('data', (newData) => {
            setData(prevData => {
                const labels = [...prevData.labels, new Date().toLocaleTimeString()];
                const values = [...prevData.datasets[0].data, newData[field]];
                
                // Keep last 100 points
                if (labels.length > 100) {
                    labels.shift();
                    values.shift();
                }

                return {
                    labels,
                    datasets: [{
                        ...prevData.datasets[0],
                        data: values
                    }]
                };
            });
        });

        return () => socket.disconnect();
    }, [deviceId, field]);

    return <Line data={data} />;
}
