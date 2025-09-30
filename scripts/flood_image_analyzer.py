#!/usr/bin/env python3
"""
Flood Image Analyzer
批量分析洪水图像，估算水深并生成结构化报告

使用OpenAI API (优先o3模型)分析图像中的洪水深度
"""

import os
import json
import base64
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
import time

try:
    from openai import OpenAI
    from PIL import Image
except ImportError as e:
    print(f"❌ 缺少依赖库: {e}")
    print("请安装: pip install openai pillow python-dotenv")
    exit(1)

# 支持的图像格式
SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}

class FloodImageAnalyzer:
    def __init__(self, api_key: str = None):
        """初始化分析器"""
        # 从环境变量或参数获取API key
        if api_key is None:
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                # 尝试从.env文件读取
                env_path = Path('backend/.env')
                if env_path.exists():
                    with open(env_path, 'r') as f:
                        for line in f:
                            if line.startswith('OPENAI_API_KEY='):
                                api_key = line.split('=', 1)[1].strip().strip("'\"")
                                break
        
        if not api_key:
            raise ValueError("❌ 未找到OPENAI_API_KEY。请设置环境变量或在backend/.env文件中配置。")
        
        self.client = OpenAI(api_key=api_key)
        print("✅ OpenAI客户端初始化成功")
        
        # 洪水深度分析的专业prompt (更新版本)
        self.flood_prompt = """**Task**
You are an engineering vision assistant. From a single Charleston Harbor parking-lot frame, estimate:
  • Water depth at the flooded parking area (cm, integer)
  • Passability for an ordinary sedan
  • Short justification

**Region of interest (ROI)**
Focus ONLY on the left-bottom parking area (asphalt with white bay stripes) and the planter/harbor curb that borders it.

**Visual anchors & canonical dimensions**
  • Concrete wheel stop height = 13 cm
  • Planter/harbor curb reveal (asphalt → curb top) = 45 cm (allow ±5 cm)

**Multi-anchor measurement (required)**
Use at least TWO anchors (e.g., wheel-stop coverage + stripe clarity + curb margin).
When measurable, include a rough pixel→cm reasoning; otherwise cite qualitative cues tied to the bands.

**Cue-based depth bands (aligned with 45 ±5 cm curb reveal)**
  < 5:   wheel stops dry; stripes crisp
  5–10:  pooling at wheel-stop base; stripes crisp
  10–15: water near wheel-stop top; stripes slightly faded
  15–20: stripes faint; curb top ≈25–30 cm ABOVE water
  20–25: stripes barely visible; curb top ≈20–25 cm ABOVE water
  25–30: stripes gone;   curb top ≈15–20 cm ABOVE water; no spill on walkway
  30–35: curb top ≈10–15 cm ABOVE water; no sustained spill
  35–40: curb top ≈ 5–10 cm ABOVE water; occasional kiss/splash only
  40–50: curb top 0–5 cm ABOVE water OR OVERTOPPED; thin (0–5 cm) sheet on walkway
  > 50:  walkway broadly flooded (>5 cm); post bases or chains close to water

**Overtopping (escalation) rules**
If you see a continuous lip/foam crossing onto the walkway or a reflective sheet on the walkway, set the band to ≥40–50.
Thin film 0–5 cm → 40–50; clearly >5 cm → >50.

**Passability rules (sedan)**
  pass ≤ 15 cm; caution 16–30 cm; unsafe > 30 cm

**Conflict handling**
If different anchors disagree by >10 cm, choose the larger (conservative) depth and state the reason (e.g., rain blur, glare).

**Output**
Return JSON ONLY:
{
  "depth_cm_estimate": <integer>,
  "depth_range": "<one of: <5 | 5–10 | 10–15 | 15–20 | 20–25 | 25–30 | 30–35 | 35–40 | 40–50 | >50>",
  "passability": "<pass|caution|unsafe>",
  "justification": "Brief: anchors used, and any evidence."
}
"""

        # JSON Schema for structured output
        self.response_schema = {
            "type": "object",
            "properties": {
                "depth_cm_estimate": {
                    "type": "number",
                    "description": "Estimated water depth in centimeters"
                },
                "depth_range": {
                    "type": "string",
                    "description": "Depth range category"
                },
                "passability": {
                    "type": "string",
                    "enum": ["pass", "caution", "unsafe", "unknown"],
                    "description": "Vehicle passability assessment"
                },
                "justification": {
                    "type": "string",
                    "description": "Detailed reasoning for the assessment"
                }
            },
            "required": ["depth_cm_estimate", "depth_range", "passability", "justification"],
            "additionalProperties": False
        }
        
        # Few-shot examples setup
        self.fewshot_dir = Path(__file__).parent.parent / "data" / "fewshot_examples"
        self.fewshot_examples = [
            {"image": "9.jpg", "depth": 5, "range": "5–10", "passability": "pass", 
             "justification": "Pooling at wheel-stop base; stripes crisp; water far below curb. Anchors: 13 cm wheel stop + stripe clarity."},
            {"image": "29.jpg", "depth": 13, "range": "10–15", "passability": "pass",
             "justification": "Water near wheel-stop top (~13 cm); stripes slightly faded; curb top well above water (>30 cm margin). Anchors: wheel stop + curb margin."},
            {"image": "32.jpg", "depth": 22, "range": "20–25", "passability": "caution",
             "justification": "Stripes barely visible; curb top ≈20–25 cm above water. Cross-checked with partial wheel-stop submergence (~13 cm)."},
            {"image": "37.jpg", "depth": 28, "range": "25–30", "passability": "caution",
             "justification": "Stripes gone; curb top ≈15–20 cm above water; no reflective sheet on walkway. Anchors: curb margin + wheel-stop coverage."},
            {"image": "43.jpg", "depth": 42, "range": "40–50", "passability": "unsafe",
             "justification": "Sustained overtopping with ~0–5 cm sheet on walkway → ≥40 band; stripes lost; curb margin ~0–5 cm."},
            {"image": "45.jpg", "depth": 45, "range": "40–50", "passability": "unsafe",
             "justification": "Walkway flooding visible (>5 cm in segments); curb overtopped; chains close to water. Conservative choice per overtopping rule."}
        ]

    def encode_image(self, image_path: Path) -> tuple[str, str]:
        """编码图像为base64"""
        try:
            with open(image_path, "rb") as image_file:
                encoded = base64.b64encode(image_file.read()).decode('utf-8')
            
            # 确定MIME类型
            ext = image_path.suffix.lower()
            mime_types = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg', 
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }
            mime_type = mime_types.get(ext, 'image/jpeg')
            
            return encoded, mime_type
        except Exception as e:
            raise Exception(f"图像编码失败: {e}")

    def load_fewshot_examples(self) -> List[Dict]:
        """加载few-shot例子图像并编码"""
        encoded_examples = []
        
        for example in self.fewshot_examples:
            image_path = self.fewshot_dir / example["image"]
            
            if not image_path.exists():
                print(f"⚠️  Few-shot图像不存在: {image_path}")
                continue
                
            try:
                base64_image, mime_type = self.encode_image(image_path)
                encoded_examples.append({
                    "image_data": base64_image,
                    "mime_type": mime_type,
                    "expected_output": {
                        "depth_cm_estimate": example["depth"],
                        "depth_range": example["range"],
                        "passability": example["passability"],
                        "justification": example["justification"]
                    }
                })
            except Exception as e:
                print(f"⚠️  Few-shot图像编码失败 {example['image']}: {e}")
                continue
        
        print(f"✅ 成功加载 {len(encoded_examples)} 个few-shot例子")
        return encoded_examples

    def build_fewshot_messages(self, encoded_examples: List[Dict], target_image_data: str, target_mime_type: str) -> List[Dict]:
        """构建包含few-shot例子的消息列表"""
        messages = []
        
        # 添加系统指令
        messages.append({
            "role": "system",
            "content": "You are an engineering vision assistant specialized in flood depth analysis. Learn from the following examples and apply the same methodology to new images."
        })
        
        # 添加few-shot例子
        for i, example in enumerate(encoded_examples):
            # User message with example image
            messages.append({
                "role": "user", 
                "content": [
                    {"type": "text", "text": f"Example {i+1}. Estimate flooding for this single frame."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{example['mime_type']};base64,{example['image_data']}",
                            "detail": "high"
                        }
                    }
                ]
            })
            
            # Assistant response with expected output
            expected = example["expected_output"]
            response_json = json.dumps({
                "depth_cm_estimate": expected["depth_cm_estimate"],
                "depth_range": expected["depth_range"], 
                "passability": expected["passability"],
                "justification": expected["justification"]
            }, ensure_ascii=False)
            
            messages.append({
                "role": "assistant",
                "content": response_json
            })
        
        # 添加实际要分析的图像
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": self.flood_prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{target_mime_type};base64,{target_image_data}",
                        "detail": "high"
                    }
                }
            ]
        })
        
        return messages

    def parse_json_response(self, content: str) -> Dict:
        """解析JSON响应，带有错误恢复"""
        try:
            # 直接尝试解析
            return json.loads(content)
        except json.JSONDecodeError as e:
            print(f"  ⚠️  JSON解析失败，尝试清理: {e}")
            
            # 尝试从响应中提取JSON块
            import re
            json_match = re.search(r'\{[^}]*"depth_cm_estimate"[^}]*\}', content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass
            
            # 如果还是失败，抛出原始错误
            raise e

    def analyze_image(self, image_path: Path, max_retries: int = 3) -> Dict:
        """分析单张图像"""
        print(f"📊 分析图像: {image_path.name}")
        
        try:
            # 编码目标图像
            base64_image, mime_type = self.encode_image(image_path)
            
            # 加载few-shot例子（只在第一次调用时加载）
            if not hasattr(self, '_fewshot_cache'):
                print("🔄 加载few-shot例子...")
                self._fewshot_cache = self.load_fewshot_examples()
            
            # 构建包含few-shot的消息
            if self._fewshot_cache:
                messages = self.build_fewshot_messages(self._fewshot_cache, base64_image, mime_type)
                print(f"  📚 使用 {len(self._fewshot_cache)} 个few-shot例子")
            else:
                # 如果没有few-shot例子，使用原始方法
                messages = [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": self.flood_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}",
                                "detail": "high"
                            }
                        }
                    ]
                }]
                print("  ⚠️  未使用few-shot例子")
            
            # 尝试多个模型，优先使用GPT-4o
            models_to_try = ["gpt-4o", "gpt-4o-mini"]
            
            for attempt in range(max_retries):
                for model in models_to_try:
                    try:
                        print(f"  🔄 尝试模型: {model} (第{attempt + 1}次)")
                        
                        # 根据模型调整参数 - 所有模型都支持JSON schema
                        api_params = {
                            "model": model,
                            "messages": messages,
                            "max_completion_tokens": 2000,
                            "response_format": {
                                "type": "json_schema",
                                "json_schema": {
                                    "name": "flood_analysis",
                                    "strict": True,
                                    "schema": self.response_schema
                                }
                            }
                        }
                        
                        response = self.client.chat.completions.create(**api_params)
                        
                        # 解析响应
                        content = response.choices[0].message.content
                        if not content:
                            raise Exception("API返回空响应")
                            
                        analysis_data = self.parse_json_response(content)
                        
                        print(f"  ✅ 成功 - 模型: {model}")
                        print(f"     水深: {analysis_data.get('depth_cm_estimate')}cm")
                        print(f"     通行性: {analysis_data.get('passability')}")
                        
                        # 返回完整结果
                        return {
                            "filename": image_path.name,
                            "filepath": str(image_path),
                            "timestamp": datetime.now().isoformat(),
                            "model_used": model,
                            "analysis_success": True,
                            **analysis_data
                        }
                        
                    except Exception as model_error:
                        print(f"  ❌ 模型 {model} 失败: {model_error}")
                        continue
                
                # 如果所有模型都失败，等待后重试
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    print(f"  ⏳ 等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
            
            # 所有尝试都失败
            raise Exception("所有模型和重试都失败了")
            
        except Exception as e:
            print(f"  ❌ 分析失败: {e}")
            return {
                "filename": image_path.name,
                "filepath": str(image_path),
                "timestamp": datetime.now().isoformat(),
                "model_used": "none",
                "analysis_success": False,
                "error": str(e),
                "depth_cm_estimate": None,
                "depth_range": "unknown",
                "passability": "unknown", 
                "justification": f"分析失败: {str(e)}"
            }

    def get_image_files(self, directory: Path) -> List[Path]:
        """获取目录中的所有图像文件，并按文件名中的数字排序"""
        image_files = []
        for file_path in directory.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_FORMATS:
                image_files.append(file_path)
        
        def sort_key(path: Path):
            try:
                # 对于数字文件名，返回一个元组，将它们优先排序
                return (0, int(path.stem))
            except ValueError:
                # 对于非数字文件名，返回一个元组，将它们排在数字文件名之后
                return (1, path.name)

        return sorted(image_files, key=sort_key)

    def analyze_batch(self, images_dir: str = "data/test_images", output_file: str = "data/results/analysis_results.json") -> Dict:
        """批量分析图像"""
        images_path = Path(images_dir)
        
        if not images_path.exists():
            raise FileNotFoundError(f"图像目录不存在: {images_path}")
        
        # 获取图像文件
        image_files = self.get_image_files(images_path)
        
        if not image_files:
            print(f"❌ 在 {images_path} 中未找到支持的图像文件")
            print(f"支持的格式: {', '.join(SUPPORTED_FORMATS)}")
            summary = {
                "total_images": 0,
                "successful_analyses": 0,
                "failed_analyses": 0,
                "success_rate": "0.0%",
                "analysis_timestamp": datetime.now().isoformat()
            }
            return {"results": [], "summary": summary}
        
        print(f"🔍 找到 {len(image_files)} 张图像:")
        for img_file in image_files:
            print(f"  - {img_file.name}")
        
        # 批量分析
        print(f"\n🚀 开始批量分析...")
        results = []
        success_count = 0
        
        for i, image_file in enumerate(image_files, 1):
            print(f"\n📷 [{i}/{len(image_files)}] 处理: {image_file.name}")
            
            result = self.analyze_image(image_file)
            results.append(result)
            
            if result["analysis_success"]:
                success_count += 1
            
            # 添加小延迟避免API限制
            time.sleep(0.5)
        
        # 生成汇总报告
        summary = {
            "total_images": len(image_files),
            "successful_analyses": success_count,
            "failed_analyses": len(image_files) - success_count,
            "success_rate": f"{(success_count / len(image_files) * 100):.1f}%",
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        # 保存结果
        output_data = {
            "summary": summary,
            "results": results
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 批量分析完成!")
        print(f"✅ 成功: {success_count}/{len(image_files)} ({summary['success_rate']})")
        print(f"💾 结果已保存到: {output_file}")
        
        return output_data


def main():
    """主函数"""
    print("🌊 洪水图像批量分析器")
    print("=" * 50)
    
    try:
        # 初始化分析器
        analyzer = FloodImageAnalyzer()
        
        # 执行批量分析
        results = analyzer.analyze_batch(
            images_dir="data/test_images",
            output_file="data/results/analysis_results.json"
        )
        
        # 显示汇总信息
        summary = results["summary"]
        print(f"\n📈 分析汇总:")
        print(f"   总图像数: {summary['total_images']}")
        print(f"   成功分析: {summary['successful_analyses']}")
        print(f"   失败分析: {summary['failed_analyses']}")
        print(f"   成功率: {summary['success_rate']}")
        
        if summary["successful_analyses"] > 0:
            print(f"\n💧 水深分析结果:")
            for result in results["results"]:
                if result["analysis_success"]:
                    print(f"   {result['filename']}: {result['depth_cm_estimate']}cm ({result['passability']})")
        
    except Exception as e:
        print(f"❌ 程序执行失败: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())