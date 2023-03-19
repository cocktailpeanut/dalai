import { CheckBox } from '@mui/icons-material';
import { Box, Button, Select, TextField, Grid } from '@mui/material';
import React from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { Container } from '@mui/system';

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
  models: string[];
  model: string;
}

const Parameters = () => {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      seed: -1,
      threads: 4,
      n_predict: 200,
      top_k: 40,
      top_p: 0.9,
      temp: 0.1,
      repeat_last_n: 64,
      repeat_penalty: 1.3,
      debug: false,
      models: [],
      model: 'alpaca.7B',
    },
  });
  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    console.log(data);
  };
  return (
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
              console.log(field.value);
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
              console.log(field.value);
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
              console.log(field.value);
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
              console.log(field.value);
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
              console.log(field.value);
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
              console.log(field.value);
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
              console.log(field.value);
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
            render={({ field }) => <CheckBox {...field} />}
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
