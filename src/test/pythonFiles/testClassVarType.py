class Person:
    id = 1
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def greet(self):
        return f"Hello, my name is {self.name} and I a {self.age} years old."
    
person1 = Person("John Doe", 30)
person1.greet()
person1.id = 3
