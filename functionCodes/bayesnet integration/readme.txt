 Pure Python Flood Prediction Script

  📖 概述

  pure_python_prediction.py 是一个完全独立的洪水预测脚本，使用纯Python实现    
  贝叶斯网络，无需pandas等外部依赖。基于Charleston历史洪水数据训练37节点可    
  靠贝叶斯网络，对2025年洪水事件进行实时累积预测。

  🎯 主要功能

  - 可靠贝叶斯建模：使用严格参数 (occ_thr=5, edge_thr=3, weight_thr=0.4)      
  构建37节点网络
  - 实时累积预测：按10分钟时间窗口进行累积证据预测
  - 零外部依赖：仅使用Python标准库，避免环境兼容性问题
  - 完整JSON输出：生成符合标准格式的预测结果文件

  📊 输入数据

  训练数据

  - 文件：src/models/Road_Closures_2024.csv
  - 内容：Charleston 2015-2024年历史道路封闭数据
  - 格式：CSV格式，包含STREET, START, REASON等字段
  - 过滤条件：仅使用REASON="FLOOD"的记录

  测试数据

  - 文件：archive/old_results/2025_flood_processed.csv
  - 内容：2025年8月22日洪水事件数据
  - 时间范围：12:19 PM - 13:49 PM（约1.5小时）
  - 格式：包含street, start_time, split_type字段

  🔧 核心参数

  occ_thr = 5      # 道路最小出现次数（严格筛选）
  edge_thr = 3     # 边的最小共现次数
  weight_thr = 0.4 # 条件概率阈值（高可靠性）
  window_minutes = 10  # 时间窗口间隔

  📈 输出结果

  控制台输出

  🌊 Pure Python Real-Time Flood Prediction
  📚 Loading training data...
  ✅ Loaded 923 flood records
  🧠 Building Bayesian network (occ_thr=5, edge_thr=3, weight_thr=0.4)...     
  Network built: 37 nodes
  ⏱️ Creating 10-minute time windows...
  Created 8 time windows
  🔮 Running cumulative predictions...
  Window 1: 3 evidence, avg prob 0.140
  ...
  ✅ Saved 8 JSON files to results/
  🎉 SUCCESS! Network: 37 nodes

  JSON文件输出

  生成8个JSON预测结果文件：
  results/
  ├── realtime_window_01_1219_1229_PM_[timestamp].json
  ├── realtime_window_02_1229_1239_PM_[timestamp].json
  ├── ...
  └── realtime_window_08_1339_1349_PM_[timestamp].json

  JSON文件结构

  {
    "experiment_metadata": {
      "experiment_name": "Real-Time Cumulative Flood Prediction (Pure
  Python)",
      "timestamp": "2025-09-06 20:47:53",
      "description": "Using 37-node reliable network...",
      "random_seed": 42
    },
    "training_data_info": {
      "total_records": 923,
      "unique_streets": 37,
      "data_source": "Road_Closures_2024.csv"
    },
    "bayesian_network": {
      "parameters": {
        "occ_thr": 5,
        "edge_thr": 3,
        "weight_thr": 0.4
      },
      "statistics": {
        "total_nodes": 37,
        "total_edges": 171
      },
      "all_nodes": ["AMERICA_ST", "ASHLEY_AVE", ...]
    },
    "current_window": {
      "window_id": 1,
      "window_label": "12:19-12:29",
      "evidence": {
        "cumulative_evidence_roads": ["FISHBURNE_ST", "HAGOOD_AVE", ...],
        "network_evidence_roads": [...],
        "evidence_count": 5,
        "network_evidence_count": 3
      },
      "predictions": [
        {
          "road": "AMERICA_ST",
          "probability": 0.140,
          "is_evidence": false
        }
      ],
      "summary_stats": {
        "average_prediction_probability": 0.140,
        "high_risk_roads_count": 0,
        "total_non_evidence_roads": 34
      }
    }
  }

  🚀 使用方法

  python pure_python_prediction.py

  ✨ 关键优势

  - 环境友好：无pandas/numpy依赖问题
  - 参数可靠：37节点网络在覆盖面和准确性间平衡
  - 输出完整：包含完整的实验元数据和预测结果
  - 易于集成：JSON格式便于API集成和可视化