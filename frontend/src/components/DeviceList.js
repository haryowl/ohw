// frontend/src/components/DeviceList.js
import React, { useState, useEffect } from 'react';
import {
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Typography
} from '@material-ui/core';
import { Settings } from '@material-ui/icons';

function DeviceList({ onDeviceSelect }) {
    const [devices, setDevices] = useState([]);

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        const response = await fetch('/api/devices');
        const data = await response.json();
        setDevices(data);
    };

    return (
        <List>
            {devices.map(device => (
                <ListItem 
                    button 
                    key={device.id}
                    onClick={() => onDeviceSelect(device)}
                >
                    <ListItemText
                        primary={device.name}
                        secondary={`Last seen: ${new Date(device.lastSeen).toLocaleString()}`}
                    />
                    <ListItemSecondaryAction>
                        <IconButton edge="end">
                            <Settings />
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
            ))}
        </List>
    );
}
