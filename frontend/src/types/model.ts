// src/types/model.ts
export interface ModelConfig {
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  [key: string]: any;
}

export interface ModelList {
  models: ModelConfig[];
}