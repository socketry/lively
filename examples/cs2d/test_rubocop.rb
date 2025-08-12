# Test file to verify RuboCop integration

class TestClass
  def bad_method
    x=1+2   # Bad spacing (RuboCop will catch this)
    puts x
  end
end