
"""
ComfyUI License Manager 核心模块 - 修复版本
支持简单验证和加密验证两种模式
"""

import os
import json
import time
from datetime import datetime

class LicenseValidator:
    """
    许可证验证器 - 安全版本
    支持多种验证模式，确保兼容性
    """
    def __init__(self, config_path=None):
        if config_path is None:
            current_dir = os.path.dirname(__file__)
            config_path = os.path.join(current_dir, "license_config.json")
        
        self.config_path = config_path
        self.config = None
        self.encryption_available = False
        self.fernet = None
        
        # 尝试初始化
        try:
            self.config = self.load_config()
            self.init_encryption()
            print("[License Validator] 初始化成功")
        except Exception as e:
            print(f"[License Validator] 初始化失败: {e}")
            print("[License Validator] 将使用简单验证模式")
            self.init_simple_mode()
    
    def init_encryption(self):
        """初始化加密功能"""
        try:
            from cryptography.fernet import Fernet
            
            if self.config and self.config.get("encryption_key"):
                self.fernet = Fernet(self.config["encryption_key"].encode())
                self.encryption_available = True
                print("[License Validator] 加密模式已启用")
            else:
                print("[License Validator] 无加密密钥，使用简单模式")
                
        except ImportError:
            print("[License Validator] cryptography库未安装，使用简单模式")
        except Exception as e:
            print(f"[License Validator] 加密初始化失败: {e}")
    
    def init_simple_mode(self):
        """初始化简单验证模式"""
        self.config = {
            "title": "ComfyUI 许可证验证",
            "description": "请输入有效的许可证密钥来使用此服务",
            "contact_info": {
                "qq": "联系管理员",
                "wechat": "联系管理员",
                "email": "admin@example.com"
            },
            "features": [
                "🎨 AI图像生成",
                "🎥 视频处理", 
                "🔧 自定义工作流",
                "💫 高级功能"
            ],
            "simple_mode": True
        }
        
        # 创建简单的许可证文件
        self.create_simple_licenses()
    
    def create_simple_licenses(self):
        """创建简单许可证文件"""
        current_dir = os.path.dirname(__file__)
        license_file = os.path.join(current_dir, "valid_licenses.json")
        
        if not os.path.exists(license_file):
            simple_licenses = {
                "licenses": {
                    "test123": {
                        "user_id": "test_user",
                        "expire_time": -1,
                        "max_uses": -1,
                        "current_uses": 0,
                        "features": ["all"],
                        "created": datetime.now().isoformat(),
                        "status": "active"
                    },
                    "demo456": {
                        "user_id": "demo_user", 
                        "expire_time": int(time.time()) + 86400*30,  # 30天后过期
                        "max_uses": 100,
                        "current_uses": 0,
                        "features": ["basic"],
                        "created": datetime.now().isoformat(),
                        "status": "active"
                    },
                    "admin789": {
                        "user_id": "admin_user",
                        "expire_time": -1,
                        "max_uses": -1, 
                        "current_uses": 0,
                        "features": ["all", "admin"],
                        "created": datetime.now().isoformat(),
                        "status": "active"
                    }
                },
                "created": datetime.now().isoformat(),
                "mode": "simple"
            }
            
            try:
                with open(license_file, 'w', encoding='utf-8') as f:
                    json.dump(simple_licenses, f, indent=2, ensure_ascii=False)
                print(f"[License Validator] 已创建简单许可证文件: {license_file}")
                print("[License Validator] 测试卡密: test123, demo456, admin789")
            except Exception as e:
                print(f"[License Validator] 创建许可证文件失败: {e}")
    
    def load_config(self):
        """加载许可证配置"""
        default_config = {
            "title": "ComfyUI 许可证验证",
            "description": "请输入有效的许可证密钥来使用此服务",
            "contact_info": {
                "qq": "123456789",
                "wechat": "your_wechat", 
                "email": "contact@example.com"
            },
            "features": ["🎨 AI图像生成", "🎥 视频处理", "🔧 自定义工作流"],
            "salt": "comfyui_license_salt"
        }
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                default_config.update(config)
                return default_config
            except Exception as e:
                print(f"[License Validator] 配置文件加载失败: {e}")
                return default_config
        else:
            return default_config
    
    def get_config_info(self):
        """获取配置信息（用于前端显示）"""
        if not self.config:
            return {"title": "ComfyUI 许可证验证", "description": "系统初始化中..."}
            
        return {
            "title": self.config.get("title", "ComfyUI 许可证验证"),
            "description": self.config.get("description", "请输入有效的许可证密钥"),
            "contact_info": self.config.get("contact_info", {}),
            "features": self.config.get("features", []),
            "mode": "encrypted" if self.encryption_available else "simple"
        }
    
    def validate_license(self, license_key):
        """验证许可证"""
        if not license_key:
            return False, "许可证密钥不能为空"
        
        # 根据模式选择验证方式
        if self.encryption_available and self.fernet:
            return self.validate_encrypted_license(license_key)
        else:
            return self.validate_simple_license(license_key)
    
    def validate_encrypted_license(self, license_key):
        """验证加密许可证"""
        try:
            # 解密许可证
            decrypted_data = self.fernet.decrypt(license_key.encode())
            license_data = json.loads(decrypted_data.decode())
            
            # 验证许可证结构
            required_fields = ['user_id', 'expire_time', 'max_uses', 'features']
            for field in required_fields:
                if field not in license_data:
                    return False, f"许可证格式错误：缺少{field}字段"
            
            # 检查过期时间
            if license_data['expire_time'] != -1:
                expire_time = datetime.fromtimestamp(license_data['expire_time'])
                if datetime.now() > expire_time:
                    return False, "许可证已过期"
            
            # 检查使用次数
            current_uses = license_data.get('current_uses', 0)
            if license_data['max_uses'] != -1 and current_uses >= license_data['max_uses']:
                return False, "许可证使用次数已耗尽"
            
            return True, license_data
            
        except Exception as e:
            return False, f"许可证验证失败: {str(e)}"
    
    def validate_simple_license(self, license_key):
        """验证简单许可证"""
        try:
            current_dir = os.path.dirname(__file__)
            license_file = os.path.join(current_dir, "valid_licenses.json")
            
            if not os.path.exists(license_file):
                return False, "许可证数据库不存在"
            
            with open(license_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            licenses = data.get("licenses", {})
            
            if license_key not in licenses:
                return False, "无效的许可证密钥"
            
            license_data = licenses[license_key]
            
            # 检查状态
            if license_data.get('status') != 'active':
                return False, "许可证已禁用"
            
            # 检查过期时间
            if license_data['expire_time'] != -1:
                if time.time() > license_data['expire_time']:
                    return False, "许可证已过期"
            
            # 检查使用次数
            current_uses = license_data.get('current_uses', 0)
            if license_data['max_uses'] != -1 and current_uses >= license_data['max_uses']:
                return False, "许可证使用次数已耗尽"
            
            return True, license_data
            
        except Exception as e:
            return False, f"许可证验证失败: {str(e)}"
    
    def get_license_info(self, license_key):
        """获取许可证信息"""
        is_valid, result = self.validate_license(license_key)
        if not is_valid:
            return False, result
        
        license_data = result
        
        # 格式化信息
        info = {
            'user_id': license_data.get('user_id', 'unknown'),
            'features': license_data.get('features', []),
            'current_uses': license_data.get('current_uses', 0),
            'max_uses': license_data.get('max_uses', -1),
            'expire_time': license_data.get('expire_time', -1),
            'is_expired': False,
            'status': license_data.get('status', 'active')
        }
        
        # 计算剩余使用次数
        if info['max_uses'] == -1:
            info['remaining_uses'] = -1
        else:
            info['remaining_uses'] = max(0, info['max_uses'] - info['current_uses'])
        
        # 检查是否过期
        if info['expire_time'] != -1:
            expire_time = datetime.fromtimestamp(info['expire_time'])
            info['expire_time_str'] = expire_time.strftime('%Y-%m-%d %H:%M:%S')
            info['is_expired'] = datetime.now() > expire_time
        else:
            info['expire_time_str'] = '永不过期'
        
        return True, info

# 安全的全局实例创建
license_validator = None

def get_license_validator():
    """安全获取许可证验证器实例"""
    global license_validator
    if license_validator is None:
        try:
            license_validator = LicenseValidator()
        except Exception as e:
            print(f"[License] 验证器创建失败: {e}")
            # 创建一个基本的验证器
            license_validator = LicenseValidator()
    return license_validator

# 为了兼容性，保留原有的导入方式
try:
    license_validator = get_license_validator()
except Exception as e:
    print(f"[License] 全局验证器创建失败: {e}")
    license_validator = None