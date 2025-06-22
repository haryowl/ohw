import React from 'react';
import { Box, Typography } from '@mui/material';
import DataTable from '../components/DataTable';

const DataTablePage = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Device Data Records
            </Typography>
            <DataTable />
        </Box>
    );
};

export default DataTablePage; 