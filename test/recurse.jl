using IRTools, Test
using IRTools: xcall, func, argument!, @dynamo, IR, insertafter!, return!, recurse!

foo(::typeof(*), a, b) = a+b
@dynamo function foo(a...)
  ir = IR(a...)
  ir == nothing && return
  recurse!(ir)
  return ir
end

dummy() = nothing
ir = @code_ir dummy()
a = argument!(ir)
b = argument!(ir)
t = pushfirst!(ir, xcall(:tuple, a, b))
op = insertafter!(ir, t, xcall(:tuple, GlobalRef(Base, :*)))
r = insertafter!(ir, op, xcall(Core, :_apply, GlobalRef(Base, :*), t))
return!(ir, r)
foofunc = func(ir)
@assert foofunc(nothing, 0, 1) == 0
@test foo(foofunc, nothing, 0, 1) == 1

# + is called inside Core._apply_iterate(Base.iterate, (+), ...)
g(args...) = Base.:*(args...)
@assert g(0, 1) == 0
@test foo(g, 0, 1) == 1



