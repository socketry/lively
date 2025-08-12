# frozen_string_literal: true

# Test file to verify RuboCop integration with bad formatting

class TestClass
	def bad_method
		x=1+2   # Bad spacing (RuboCop will catch this)
		puts x
	end
end