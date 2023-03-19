import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { nanoid } from 'nanoid';
import { type IConfig } from '../../App';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export default function SearchAppBar({
  config,
  model,
  setModel,
  isConnected,
}: {
  config: IConfig;
  model: string;
  setModel: (model: string) => void;
  isConnected: boolean;
}) {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h5"
            noWrap
            component="div"
            sx={{ flexGrow: 1, display: { sm: 'block' }, fontWeight: 'bold' }}
          >
            Dalai
          </Typography>
          <FiberManualRecordIcon
            sx={{ mr: 1, color: isConnected ? '#7CFC00' : '#FF0000' }}
          />
          <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth>
              <InputLabel id="model">Models</InputLabel>
              <Select
                labelId="model"
                size="small"
                id="model"
                value={model}
                label="Model"
                onChange={(e) => {
                  setModel(e.target.value);
                }}
              >
                {config?.models?.map((model) => (
                  <MenuItem key={nanoid()} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
