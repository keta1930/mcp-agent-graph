import api from './api'

export interface TitleGenerationModelConfig {
  model_name: string | null
  is_configured: boolean
}

export const getTitleGenerationModel = async (): Promise<TitleGenerationModelConfig> => {
  const response = await api.get<TitleGenerationModelConfig>('/user/settings/title-generation-model')
  return response.data
}

export const setTitleGenerationModel = async (modelName: string): Promise<void> => {
  await api.post('/user/settings/title-generation-model', null, {
    params: { model_name: modelName }
  })
}

export const setUserLanguage = async (language: string): Promise<void> => {
  await api.post('/user/settings/language', null, {
    params: { language }
  })
}