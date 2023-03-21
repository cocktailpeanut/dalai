import {
  Box,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import React from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { type IConfig } from '../../App';

interface IFormInput {
  seed: number;
  threads: number;
  n_predict: number;
  top_k: number;
  top_p: number;
  temp: number;
  repeat_last_n: number;
  repeat_penalty: number;
  debug: boolean;
}

const Parameters = ({
  setConfig,
  config,
}: {
  setConfig: React.Dispatch<React.SetStateAction<IConfig>>;
  config: IConfig;
}) => {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      seed: config.seed,
      threads: config.threads,
      n_predict: config.n_predict,
      top_k: config.top_k,
      top_p: config.top_p,
      temp: config.temp,
      repeat_last_n: config.repeat_last_n,
      repeat_penalty: config.repeat_penalty,
      debug: config.debug,
    },
  });
  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    setConfig((previous: IConfig) => ({ ...previous, ...data }));
  };
  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <Box component="form" onSubmit={handleSubmit(onSubmit)} alignItems="center">
      <Grid
        container
        sx={{
          '& .MuiTextField-root': { m: 1, width: '15ch' },
        }}
      >
        <Grid
          item
          xs={12}
          alignItems="center"
          display="flex"
          flexWrap="wrap"
          justifyContent="center"
        >
          <Controller
            name="n_predict"
            control={control}
            render={({ field }) => {
              return (
                <TextField
                  value={field.value}
                  size="small"
                  label={field.name}
                  onChange={field.onChange}
                />
              );
            }}
          />
          <Controller
            name="repeat_last_n"
            control={control}
            render={({ field }) => {
              return (
                <TextField
                  value={field.value}
                  size="small"
                  label={field.name}
                  onChange={field.onChange}
                />
              );
            }}
          />
          <Controller
            name="repeat_penalty"
            control={control}
            render={({ field }) => {
              return (
                <TextField
                  value={field.value}
                  size="small"
                  label={field.name}
                  onChange={field.onChange}
                />
              );
            }}
          />
          <Controller
            name="top_k"
            control={control}
            render={({ field }) => {
              return (
                <TextField
                  value={field.value}
                  size="small"
                  label={field.name}
                  onChange={field.onChange}
                />
              );
            }}
          />
          <Controller
            name="top_p"
            control={control}
            render={({ field }) => {
              return (
                <TextField
                  value={field.value}
                  size="small"
                  label={field.name}
                  onChange={field.onChange}
                />
              );
            }}
          />
          <Controller
            name="temp"
            control={control}
            render={({ field }) => {
              return (
                <TextField
                  value={field.value}
                  size="small"
                  label={field.name}
                  onChange={field.onChange}
                />
              );
            }}
          />
          <Controller
            name="seed"
            control={control}
            render={({ field }) => {
              return (
                <TextField
                  value={field.value}
                  size="small"
                  label={field.name}
                  onChange={field.onChange}
                />
              );
            }}
          />
          <Controller
            name="debug"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox checked={field.value} onChange={field.onChange} />
                }
                label={field.name}
              />
            )}
          />
          <Button variant="outlined" type="submit">
            Save
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Parameters;
