some_list = [1, 2, 3, 7]
x = 3
if (n := len(some_list)) > x:
    print(f"The length of some_list is {n}, which is greater than {x}.")
else:
    print(f"The length of some_list is {n}, which is not greater than {x}.")
