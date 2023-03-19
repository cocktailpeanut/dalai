/* eslint-disable no-control-regex */
import React, { useEffect, useState } from 'react';
import { Container } from '@mui/system';
import {
  Box,
  CssBaseline,
  Divider,
  Paper,
  ThemeProvider,
  Typography,
  createTheme,
  Button,
  InputBase,
  Chip,
} from '@mui/material';
import SearchAppBar from './components/layout/AppBar';
import { socket } from './components/socket';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import { nanoid } from 'nanoid';
import Parameters from './components/forms/Parameters.form';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000',
    },
  },
});

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: '100%',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '100%',
      '&:focus': {
        width: '100%',
      },
    },
  },
}));

function App() {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [loading, setLoading] = useState<boolean>(false);
  const createId = () => {
    return nanoid();
  };
  interface IConfig {
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
    prompt?: string;
    id?: string | null;
  }
  const [config, setConfig] = useState<IConfig>({
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
  });
  const model = 'alpaca.7B';
  interface Response {
    id: string;
    textContent: string;
    prompt: string;
  }
  const [responses, setResponses] = useState<Response[]>([]);

  const [question, setQuestion] = useState<string>('');
  const [ids, setId] = useState<string>('');

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.emit('request', {
      method: 'installed',
    });
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  socket.on(
    'result',
    async ({
      request,
      response,
    }: {
      request: {
        method: string;
        id: string;
      };
      response: string;
    }) => {
      setLoading(false);
      if (request.method === 'installed') {
        if (response === '\n\n<end>') {
          // document.querySelector(".form-header").innerHTML = renderHeader(config)
        } else {
          // setConfig((previous: any) => ({...previous, models: [response]}) )
        }
      } else {
        if (response === '\n\n<end>') {
          //
        } else {
          const id = request.id;
          const existing = responses.findIndex((r) => r.id === id);
          if (existing > -1) {
            const t = (responses[existing].textContent + response).replaceAll(
              /\r?\n\x1B\[\d+;\d+H./g,
              ''
            );
            const prompt = responses[existing]?.prompt;
            setResponses((previous) =>
              previous
                .filter((item) => item.id !== id)
                /* Append replacement { label, uniqueId } to state array */
                .concat([{ id, textContent: t, prompt }])
            );
            // existing.textContent = existing.textContent.replaceAll("\\n", "\n");
          } else {
            const t = (
              responses[existing]?.textContent || '' + response
            ).replaceAll(/\r?\n\x1B\[\d+;\d+H./g, '');
            const prompt = responses[existing]?.prompt;
            setResponses((previous) =>
              previous
                .filter((item) => item.id !== id)
                /* Append replacement { label, uniqueId } to state array */
                .concat([{ id, textContent: t, prompt }])
            );
          }
        }
      }
    }
  );

  useEffect(() => {
    console.log(config);
    if (config.id) {
      console.log('emitting request');
      socket.emit('request', config);
      setConfig((previous: any) => ({ ...previous, prompt: '', id: null }));
      setQuestion('');
    }
  }, [config]);

  const emitQuestion = (question: string, id: string) => {
    console.log(id);
    setConfig((previous) => ({ ...previous, prompt: question, id }));
    setResponses((previous) =>
      previous
        .filter((item) => item.id !== id)
        /* Append replacement { label, uniqueId } to state array */
        .concat([{ id, textContent: '', prompt: question }])
    );
    config.id = null;
    setLoading(true);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SearchAppBar
        question={question}
        setQuestion={setQuestion}
        emitQuestion={emitQuestion}
      />

      <Container maxWidth="xl">
        <Box my={4} justifyContent="center">
          <Parameters />
          <Typography variant="h5" component="h2" gutterBottom>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search…"
                inputProps={{ 'aria-label': 'search2' }}
                value={question}
                multiline
                onChange={(e) => {
                  setQuestion(e.target.value);
                }}
              />
            </Search>
            <Button
              sx={{ ml: 2 }}
              variant="contained"
              disabled={question.length <= 0}
              onClick={() => {
                emitQuestion(question, createId());
              }}
            >
              ASK
            </Button>
          </Box>
        </Box>

        {responses.map((r) => {
          return (
            <Paper
              key={r.id}
              elevation={2}
              sx={{
                my: 2,
                p: 1,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Chip label={` ID: ${r.id}`} />
                <Chip label={` PROMPT: ${r.prompt}`} color="error" />
                <Divider
                  sx={{
                    my: 2,
                  }}
                />
                <Typography variant="body1" component="h2" gutterBottom>
                  {r.textContent}
                </Typography>
              </Box>
            </Paper>
          );
        })}
        {/* <Paper elevation={6} variant="outlined">
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Typography variant="h5" component="h2" gutterBottom>
          {' '}
          This is a sheet of paper.{' '}
        </Typography>
    </Box>
    </Paper> */}
      </Container>
    </ThemeProvider>
  );
}

export default App;
