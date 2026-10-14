import os
import sys

def isolate_service(service_relative_path: str):
    # Remove existing 'app' modules from sys.modules
    for mod in list(sys.modules.keys()):
        if mod == "app" or mod.startswith("app."):
            del sys.modules[mod]
            
    test_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(test_dir)
    base = os.path.join(project_root, service_relative_path)
    
    sys.path = [p for p in sys.path if "services" not in p and "gateway" not in p]
    sys.path.insert(0, base)
