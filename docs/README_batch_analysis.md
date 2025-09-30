# 洪水图像批量分析器

## 使用步骤

### 1. 准备测试图像
将要分析的洪水图像放入 `data/test_images/` 文件夹中。

支持的图像格式：
- JPEG (*.jpg, *.jpeg)
- PNG (*.png) 
- GIF (*.gif)
- WebP (*.webp)

### 2. 运行分析脚本
```bash
python3 scripts/flood_image_analyzer.py
```

### 3. 查看结果
分析完成后，结果将保存在 `data/results/analysis_results.json` 文件中。

## 功能特性

- ✅ **多模型支持**: 优先使用o3模型，自动降级到其他模型
- ✅ **专业prompt**: 使用Charleston Harbor停车场洪水深度估算的专业prompt
- ✅ **结构化输出**: JSON Schema确保数据格式一致
- ✅ **错误处理**: 自动重试和错误恢复
- ✅ **进度显示**: 实时显示分析进度
- ✅ **批量处理**: 支持大量图像的批量分析

## 输出格式

每张图像的分析结果包含：

```json
{
  "filename": "flood_image.jpg",
  "timestamp": "2025-08-12T01:00:00Z",
  "model_used": "o3",
  "analysis_success": true,
  "depth_cm_estimate": 12,
  "depth_range": "10-15 cm",
  "passability": "pass",
  "justification": "详细的分析说明..."
}
```

## API Key配置

脚本会自动从以下位置读取OpenAI API Key：
1. 环境变量 `OPENAI_API_KEY`
2. `backend/.env` 文件中的配置

确保API Key有效且有足够的配额。

## 下一步：Dashboard集成

分析完成后，可以修改dashboard来直接读取 `data/results/analysis_results.json` 文件，无需实时API调用。