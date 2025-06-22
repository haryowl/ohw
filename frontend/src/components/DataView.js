import React, { useState, useEffect } from 'react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableRow,
    Paper,
    Checkbox
} from '@material-ui/core';

function DataView() {
    const [data, setData] = useState([]);
    const [selectedFields, setSelectedFields] = useState([]);
    const [availableFields, setAvailableFields] = useState([]);

    useEffect(() => {
        // Fetch available fields and data
        fetchFields();
        fetchData();
    }, []);

    const fetchFields = async () => {
        const response = await fetch('/api/fields');
        const fields = await response.json();
        setAvailableFields(fields);
    };

    const fetchData = async () => {
        const response = await fetch('/api/data');
        const deviceData = await response.json();
        setData(deviceData);
    };

    return (
        <Paper>
            <div>
                {availableFields.map(field => (
                    <Checkbox
                        checked={selectedFields.includes(field)}
                        onChange={() => handleFieldToggle(field)}
                        label={field}
                    />
                ))}
            </div>
            <Table>
                <TableHead>
                    <TableRow>
                        {selectedFields.map(field => (
                            <TableCell>{field}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map(row => (
                        <TableRow>
                            {selectedFields.map(field => (
                                <TableCell>{row[field]}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
}

export default DataView;
