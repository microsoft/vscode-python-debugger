if __name__ == "__main__":
    print("Hello, World!")
    import sys
    import os
    import json

    print(os.environ["DEBUGPY_ADAPTER_ENDPOINTS"])
    file_path = "/Users/eleanorboyd/vscode-python-debugger/comms-file.txt"
    if os.path.exists(file_path):
        with open(file_path, "r") as file:
            print("FILE CONTENTS: \n")
            contents = file.read()
            c_thing = json.loads(contents)
            if c_thing.get("client"):
                # print("CLIENT: ", c_thing["client"])
                if c_thing.get("client").get("port"):
                    print("Port: ", c_thing.get("client").get("port"))
            # print(contents)
    else:
        print(f"{file_path} does not exist.")
