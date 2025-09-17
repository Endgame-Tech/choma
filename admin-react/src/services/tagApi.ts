import { api } from './api';

export interface Tag {
  _id: string;
  tagId: string;
  name: string;
  image: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  mealPlanCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagData {
  name: string;
  image: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateTagData extends Partial<CreateTagData> {}

export interface TagsResponse {
  success: boolean;
  data: Tag[];
  count: number;
}

export interface TagResponse {
  success: boolean;
  data: Tag;
}

class TagApi {
  private baseUrl = '/tags';

  // Get all tags
  async getAllTags(): Promise<TagsResponse> {
    const response = await api.get(this.baseUrl);
    return response.data;
  }

  // Get tag by ID
  async getTagById(id: string): Promise<TagResponse> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // Create new tag
  async createTag(tagData: CreateTagData): Promise<TagResponse> {
    const response = await api.post(this.baseUrl, tagData);
    return response.data;
  }

  // Update tag
  async updateTag(id: string, tagData: UpdateTagData): Promise<TagResponse> {
    const response = await api.put(`${this.baseUrl}/${id}`, tagData);
    return response.data;
  }

  // Delete tag
  async deleteTag(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // Get meal plans by tag
  async getMealPlansByTag(
    tagId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const response = await api.get(`/tags/${tagId}/mealplans`, {
      params: { page, limit }
    });
    return response.data;
  }
}

export const tagsApi = new TagApi();