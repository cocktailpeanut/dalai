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
  border: '1px solid #000',
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

export interface IConfig {
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

export const ConfigContext = React.createContext<IConfig>({
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

export const ThemeContext = React.createContext<{
  dark: boolean;
  toggleTheme: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  dark: true,
  toggleTheme: () => {},
});

const themeDark = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000',
    },
  },
});

const themeLight = createTheme({
  palette: {},
});
interface Response {
  id: string;
  textContent: string;
  prompt: string;
}

const prepend = (element: any, array: Response[] = []) =>
  !element ? [] : Array.of(element, ...array);

function App() {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [loading, setLoading] = useState<boolean>(false);

  const [dark, toggleTheme] = useState(
    localStorage.getItem('theme-dark') === 'true'
  );
  const [muiTheme, setMuiTheme] = React.useState(themeDark);
  useEffect(() => {
    const theme = localStorage.getItem('theme-dark') === 'true';
    setMuiTheme(theme ? themeDark : themeLight);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme-dark', dark.toString());
    setMuiTheme(dark ? themeDark : themeLight);
  }, [dark]);

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
    model: '',
  });
  const [model, setModel] = useState<string>('');
  const createId = () => {
    return nanoid();
  };

  useEffect(() => {
    console.log('model', model);
    setConfig((previous) => ({ ...previous, model }));
  }, [model]);

  useEffect(() => {
    if (isConnected) {
      setModel(config?.models[0] || '');
    }
  }, [isConnected]);

  const [responses, setResponses] = useState<Response[]>([]);

  const [question, setQuestion] = useState<string>('');

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
      if (request.method === 'installed') {
        if (response === '\n\n<end>') {
          // document.querySelector(".form-header").innerHTML = renderHeader(config)
        } else {
          setConfig((previous: any) => ({
            ...previous,
            models: previous.models
              .filter((m: any) => m !== response)
              .concat(response),
          }));
          setModel(config?.models[0] || '');
        }
      } else {
        if (response === '\n\n<end>') {
          setLoading(false);
        } else {
          const id = request.id;
          const existing = responses.findIndex((r) => r.id === id);
          if (existing > -1) {
            const t = (responses[existing].textContent + response).replaceAll(
              /\r?\n\x1B\[\d+;\d+H./g,
              ''
            );
            const prompt = responses[existing]?.prompt;
            setResponses((previous) => {
              const p = previous.filter((item) => item.id !== id);
              return prepend({ id, textContent: t, prompt }, p);
              /* Append replacement { label, uniqueId } to state array */
            });
            // existing.textContent = existing.textContent.replaceAll("\\n", "\n");
          } else {
            const t = (
              responses[existing]?.textContent || '' + response
            ).replaceAll(/\r?\n\x1B\[\d+;\d+H./g, '');
            const prompt = responses[existing]?.prompt;
            setResponses((previous) => {
              const p = previous.filter((item) => item.id !== id);
              return prepend({ id, textContent: t, prompt }, p);
              /* Append replacement { label, uniqueId } to state array */
            });
          }
        }
      }
    }
  );

  useEffect(() => {
    if (config.id) {
      socket.emit('request', config);
      setConfig((previous: any) => ({ ...previous, prompt: '', id: null }));
      setQuestion('');
    }
  }, [config]);

  const emitQuestion = (question: string, id: string) => {
    setConfig((previous) => ({ ...previous, prompt: question, id }));
    setResponses((previous) => {
      const p = previous.filter((item) => item.id !== id);
      return prepend({ id, textContent: '', prompt: question }, p);
      /* Append replacement { label, uniqueId } to state array */
    });
    config.id = null;
    setLoading(true);
  };

  const clearHistory = () => {
    setResponses([]);
  };

  const deleteResponse = (id: string) => {
    setResponses((previous) => previous.filter((item) => item.id !== id));
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <ConfigContext.Provider value={config}>
        <ThemeContext.Provider
          value={{
            dark,
            toggleTheme,
          }}
        >
          <CssBaseline />
          <SearchAppBar
            config={config}
            model={model}
            setModel={setModel}
            isConnected={isConnected}
          />
          <Container maxWidth="xl">
            <Box my={4} justifyContent="center">
              <Parameters config={config} setConfig={setConfig} />
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginLeft: 0,
                }}
              >
                <Search>
                  <SearchIconWrapper>
                    <SearchIcon />
                  </SearchIconWrapper>
                  <StyledInputBase
                    placeholder="Ask me anything..."
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
                  disabled={question.length <= 0 || !isConnected || loading}
                  onClick={() => {
                    emitQuestion(question, createId());
                  }}
                >
                  ASK
                </Button>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                width: '100%',
              }}
            >
              <Button
                variant="contained"
                onClick={() => {
                  clearHistory();
                }}
              >
                Clear History
              </Button>
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
                    <Box
                      sx={{
                        position: 'relative',
                      }}
                    >
                      <Chip label={` ID: ${r.id}`} />
                      <Chip label={` PROMPT: ${r.prompt}`} color="error" />
                      <Box
                        sx={{
                          position: 'absolute',
                          right: 2,
                          top: 2,
                        }}
                      >
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            deleteResponse(r.id);
                          }}
                        >
                          Delete Response
                        </Button>
                      </Box>
                    </Box>
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
          </Container>
        </ThemeContext.Provider>
      </ConfigContext.Provider>
    </ThemeProvider>
  );
}

export default App;
