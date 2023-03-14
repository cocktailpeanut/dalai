export type ModelType = "7B" | "13B" | "30B" | "65B";

export interface QueryRequest {
  method: string;
  seed: any;
  threads: any;
  n_predict: any;
  model: any;
  top_k: any;
  top_p: any;
  temp: any;
  batch_size: any;
  repeat_last_n: any;
  repeat_penalty: any;
  prompt: any;
  full: any;
  skip_end: any;
}
