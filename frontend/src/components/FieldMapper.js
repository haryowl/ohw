// frontend/src/components/FieldMapper.js
import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Switch,
    Button
} from '@material-ui/core';

function FieldMapper({ deviceId }) {
    const [mappings, setMappings] = useState([]);

    useEffect(() => {
        fetchMappings();
    }, [deviceId]);

    const fetchMappings = async () => {
        const response = await fetch(`/api/devices/${deviceId}/mappings`);
        const data = await response.json();
        setMappings(data);
    };

    const handleMappingChange = async (mapping, field, value) => {
        const updated = { ...mapping, [field]: value };
        await fetch(`/api/devices/${deviceId}/mappings/${mapping.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        fetchMappings();
    };

    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Original Field</TableCell>
                    <TableCell>Custom Name</TableCell>
                    <TableCell>Data Type</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Enabled</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {mappings.map(mapping => (
                    <TableRow key={mapping.id}>
                        <TableCell>{mapping.originalField}</TableCell>
                        <TableCell>
                            <TextField
                                value={mapping.customName}
                                onChange={(e) => handleMappingChange(mapping, 'customName', e.target.value)}
                            />
                        </TableCell>
                        <TableCell>{mapping.dataType}</TableCell>
                        <TableCell>{mapping.unit}</TableCell>
                        <TableCell>
                            <Switch
                                checked={mapping.enabled}
                                onChange={(e) => handleMappingChange(mapping, 'enabled', e.target.checked)}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
