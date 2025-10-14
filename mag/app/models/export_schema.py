from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ExportRequest(BaseModel):
    """导出请求模型"""
    dataset_name: str = Field(..., description="数据集名称")
    file_name: str = Field(..., description="文件名称（不含扩展名）")
    conversation_ids: List[str] = Field(..., description="会话ID列表")
    file_format: str = Field(default="jsonl", description="文件格式：jsonl/parquet/csv")
    data_format: str = Field(default="standard", description="数据格式：standard")


class FileInfo(BaseModel):
    """文件信息模型"""
    file_format: str = Field(..., description="文件格式")
    file_size: str = Field(..., description="文件大小")


class ExportResponse(BaseModel):
    """导出响应模型"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    dataset_name: Optional[str] = Field(None, description="数据集名称")
    preview_data: Optional[List[Dict[str, Any]]] = Field(None, description="预览数据")
    total_records: Optional[int] = Field(None, description="总记录数")
    file_info: Optional[FileInfo] = Field(None, description="文件信息")


class PreviewResponse(BaseModel):
    """预览响应模型"""
    success: bool = Field(..., description="是否成功")
    message: Optional[str] = Field(None, description="错误消息")
    dataset_name: Optional[str] = Field(None, description="数据集名称")
    dataset_info: Optional[Dict[str, Any]] = Field(None, description="数据集信息")
    preview_data: Optional[List[Dict[str, Any]]] = Field(None, description="预览数据")
    total_records: Optional[int] = Field(None, description="总记录数")


class DeleteResponse(BaseModel):
    """删除响应模型"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    dataset_name: Optional[str] = Field(None, description="数据集名称")


class DatasetListItem(BaseModel):
    """数据集列表项模型"""
    dataset_name: str = Field(..., description="数据集名称")
    data_format: str = Field(..., description="数据格式")
    created_at: str = Field(..., description="创建时间")


class ListResponse(BaseModel):
    """列表响应模型"""
    success: bool = Field(..., description="是否成功")
    exports: List[DatasetListItem] = Field(..., description="导出列表")