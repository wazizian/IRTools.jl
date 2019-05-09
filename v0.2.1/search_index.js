var documenterSearchIndex = {"docs":
[{"location":"#IRTools-1","page":"Home","title":"IRTools","text":"","category":"section"},{"location":"#","page":"Home","title":"Home","text":"IRTools provides an IR format with several aims. The idea is to be:","category":"page"},{"location":"#","page":"Home","title":"Home","text":"Expressive enough to represent all parts of Julia's IR pipeline, from lowered code to typed SSA IR;\nEasy to manipulate, like an AST, so that people can do powerful macro-like transformations of code;\nsafe – so no segfaults if you misplace an variable somewhere.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"Note that before even attempting to understand IRTools, you should have a good handle on Julia's metaprogramming and macros.","category":"page"},{"location":"#Reading-the-IR-1","page":"Home","title":"Reading the IR","text":"","category":"section"},{"location":"#IR-Basics-1","page":"Home","title":"IR Basics","text":"","category":"section"},{"location":"#","page":"Home","title":"Home","text":"It's easiest to understand the IRTools IR by seeing some examples. We provide the macro @code_ir which behaves much like @code_lowered.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> using IRTools\n\njulia> f(x) = x+x\nf (generic function with 1 method)\n\njulia> @code_ir f(1)\n1:\n  %1 = _2 + _2\n  return %1","category":"page"},{"location":"#","page":"Home","title":"Home","text":"First things first. Arguments are numbered, and the first argument represents the function f itself, so x is presented in the IR as _2. Intermediate variables (%1, %2, %3 ...) are also numbered. IR will usually have a lot of these, which is why numbers make more sense than names.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"The main reason that there are a lot of intermediates is that, in IR, we only allow one function call per line. You can see how a nested Julia expression becomes a sequence of single instructions, kind of like an assembly language.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> f(x) = 3x*x + 2x + 1\nf (generic function with 1 method)\n\njulia> @code_ir f(1)\n1:\n  %1 = 3 * _2\n  %2 = %1 * _2\n  %3 = 2 * _2\n  %4 = %2 + %3 + 1\n  return %4","category":"page"},{"location":"#","page":"Home","title":"Home","text":"While this looks noisy and is at first a little hard to read, it's usually a helpful thing to do. IR is largely designed to be read by programs, rather than by humans, where it's usually easier to look at one instruction at a time.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"Beyond that, this is essentially just very verbosely-written Julia code.","category":"page"},{"location":"#Control-Flow-1","page":"Home","title":"Control Flow","text":"","category":"section"},{"location":"#","page":"Home","title":"Home","text":"The most significant difference between IR and Expr is how control flow is handled. There are no such thing as nested if statements, while loops and so on in IR, only branches.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> f(x) = x > 0 ? x : 0\nf (generic function with 1 method)\n\njulia> @code_ir f(1)\n1:\n  %1 = _2 > 0\n  br 3 unless %1\n2:\n  return _2\n3:\n  return 0","category":"page"},{"location":"#","page":"Home","title":"Home","text":"The block labels 1:, 2: etc and the branch br 3 unless %1 can be thought of as a version of @label and @goto. In this case the branch is conditional on the test %1 = x > 0; if that's true we'll skip the branch, move on to the label 2 and return x.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"IR is composed of a series of basic blocks that jump between each other like this. A basic block always starts with a label and ends with (optional) branches. No branches can appear in the middle of a basic block; that would just divide the block in two. Any structured control flow, however complex, can be turned into a series of blocks like this.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"Here's a more interesting example.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> function f(x)\n         if x < 0\n           x = -x\n         end\n         return x\n       end\nf (generic function with 1 method)\n\njulia> @code_ir f(1)\n1:\n  %1 = _2 < 0\n  br 3 (_2) unless %1\n2:\n  %2 = -_2\n  br 3 (%2)\n3: (%3)\n  return %3","category":"page"},{"location":"#","page":"Home","title":"Home","text":"Basic blocks are actually like mini-functions, and they accept a series of arguments. In this case block 3 takes an argument called %3 that tells it what to return. If you follow the branches as if they were function calls, you'll see that this IR behaves the same the same as the code we wrote down.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"Why not just write this as _2 = - _2? It's important to understand that variables in SSA-form IR are immutable, in the same sense that variables in functional languages are. For this reason you'll never see a statement like %2 = %2 + 1. This again makes analysing IR programmatically a lot easier, because when code uses %2 you know exactly which definition that refers to.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"Loops work this way too: they are visible in the IR by branches that jump backwards, i.e. the br 2 here.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> function pow(x, n)\n         r = 1\n         while n > 0\n           n -= 1\n           r *= x\n         end\n         return r\n       end\npow (generic function with 1 method)\n\njulia> @code_ir pow(1, 1)\n1:\n  %1 = nothing\n  br 2 (1, _3)\n2: (%2, %3)\n  %4 = %3 > 0\n  br 4 unless %4\n3:\n  %5 = %3 - 1\n  %6 = %2 * _2\n  br 2 (%6, %5)\n4:\n  return %2","category":"page"},{"location":"#Manipulating-IR-1","page":"Home","title":"Manipulating IR","text":"","category":"section"},{"location":"#Statements-1","page":"Home","title":"Statements","text":"","category":"section"},{"location":"#","page":"Home","title":"Home","text":"It's easy to get started by creating an empty fragment of IR.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> using IRTools: IR, Argument, var\n\njulia> ir = IR()\n1:","category":"page"},{"location":"#","page":"Home","title":"Home","text":"We can push new statements into the IR.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> x = arg(2)\n_2\n\njulia> x2 = push!(ir, :($x*$x))\n%1\n\njulia> ir\n1:\n  %1 = _2 * _2","category":"page"},{"location":"#","page":"Home","title":"Home","text":"push! returns a variable name that we can reuse later on.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> push!(ir, :(3*$x2 + 2*$x + 1))\n%5\n\njulia> ir\n1:\n  %1 = _2 * _2\n  %2 = 3 * %1\n  %3 = 2 * _2\n  %4 = %2 + %3 + 1","category":"page"},{"location":"#","page":"Home","title":"Home","text":"The IR can be viewed as a mapping from variables to statements, and indexing and iteration are consistent with that.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> ir[var(2)]\nIRTools.Statement(:(3 * %1), Any, 0)\n\njulia> collect(ir)\n4-element Array{Any,1}:\n (%1, IRTools.Statement(:(_2 * _2), Any, 0))\n (%2, IRTools.Statement(:(3 * %1), Any, 0))\n (%3, IRTools.Statement(:(2 * _2), Any, 0))\n (%4, IRTools.Statement(:(%2 + %3 + 1), Any, 0))","category":"page"},{"location":"#","page":"Home","title":"Home","text":"A Statement consists of an expression, a type (usually Any unless you're explicitly working with typed IR) and a line number. If you work directly with expressions IRTools will automatically wrap them with Statement(x).","category":"page"},{"location":"#","page":"Home","title":"Home","text":"There are a few other functions that do obvious things: pushfirst!, insert!, insertafter!, and delete!.","category":"page"},{"location":"#Blocks-1","page":"Home","title":"Blocks","text":"","category":"section"},{"location":"#","page":"Home","title":"Home","text":"In most cases you won't build IR from scratch, but will work from a fragment from an existing function.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> ir = @code_ir pow(1, 1)\n1:\n  %1 = nothing\n  br 2 (1, _3)\n2: (%2, %3)\n  %4 = %3 > 0\n  br 4 unless %4\n3:\n  %5 = %3 - 1\n  %6 = %2 * _2\n  br 2 (%6, %5)\n4:\n  return %2","category":"page"},{"location":"#","page":"Home","title":"Home","text":"You can work with a block at a time with block(ir, n) (all of them with blocks(ir)). Blocks similarly support functions like push!.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> using IRTools: block\n\njulia> block(ir, 2)\n2: (%2, %3)\n  %4 = %3 > 0\n  br 4 unless %4","category":"page"},{"location":"#IR-Internals-1","page":"Home","title":"IR Internals","text":"","category":"section"},{"location":"#","page":"Home","title":"Home","text":"Internally the IR data structure is quite simple, and it's worth looking at the source code for more details. Each IR fragment is essentially a list of basic blocks.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> ir = @code_ir pow(1, 1);\n\njulia> ir.blocks[1]\nIRTools.BasicBlock(IRTools.Statement[Statement(nothing, Nothing, 0)], IRTools.Variable[], IRTools.Branch[br 2 (1, _3)])","category":"page"},{"location":"#","page":"Home","title":"Home","text":"Each block is a list of statements, argument names and branches.","category":"page"},{"location":"#","page":"Home","title":"Home","text":"Note that no variable names like %2 are set here. This is defined by a mapping at the IR level:","category":"page"},{"location":"#","page":"Home","title":"Home","text":"julia> ir.defs\n6-element Array{Tuple{Int64,Int64},1}:\n (1, 1)\n (-1, -1)\n (-1, -1)\n (2, 3)\n (3, 1)\n (3, 2)","category":"page"},{"location":"#","page":"Home","title":"Home","text":"SSA values are looked up from this table, in order, so %4 refers to statement 3 of block 2 and so on. Values listed as (-1, -1) have been deleted.","category":"page"},{"location":"dynamo/#Dynamo-1","page":"Dynamo","title":"Dynamo","text":"","category":"section"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"IRTools can be used with metaprogramming tools like Cassette, but it also provides a few of its own utilities. The main one is named the \"dynamo\" after the idea of a \"dynamically-scoped macro\".","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"Let me explain. If you write down","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"@foo begin\n  bar(baz())\nend","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"then the @foo macro has access to the expression bar(baz()) and can modify this however it pleases. However, the code of the functions bar and baz are completely invisible; in more technical terms the macro has lexical extent.","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"In contrast, a dynamo looks like this:","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"foo() do\n  bar(baz())\nend","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"This can also freely modify the bar(baz()) expression (though it sees it as an IR object rather than Expr). But more importantly, it can recurse, viewing and manipulating the source code of bar and baz and even any functions they call. In other words, it has dynamic extent.","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"For example, imagine a macro for replacing * with +:","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"julia> using MacroTools\n\njulia> macro foo(ex)\n         MacroTools.prewalk(ex) do x\n           x == :* ? :+ : x\n         end |> esc\n       end\n@foo (macro with 1 method)\n\njulia> @foo 10*5\n15\n\njulia> @foo prod([5, 10])\n50","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"The explicit * that appears to the macro gets changed, but the implicit one inside prod does not. This guide shows you how to do one better.","category":"page"},{"location":"dynamo/#A-Simple-Dynamo-1","page":"Dynamo","title":"A Simple Dynamo","text":"","category":"section"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"The simplest possible dynamo is a no-op, analagous to the macro","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"macro roundtrip(ex)\n  esc(ex)\nend","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"Here it is:","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"julia> using IRTools: IR, @dynamo\n\njulia> @dynamo roundtrip(meta) = IR(meta)\n\njulia> mul(a, b) = a*b\nmul (generic function with 1 method)\n\njulia> roundtrip(mul, 2, 3)\n6","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"Here's how it works: our dynamo gets passed a metadata object meta representing the method we're working on. Typically, the only thing we'll want to do with this is to get its IR with IR(meta). Then we can transform that IR, return it, and it'll be compiled and run as usual.","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"In this case, we can easily check that the transformed code produced by roundtrip is identical to the original IR for mul.","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"julia> using IRTools: @code_ir\n\njulia> @code_ir mul(2, 3)\n1:\n  %1 = _2 * _3\n  return %1\n\njulia> @code_ir roundtrip mul(1, 2)\n1:\n  %1 = _2 * _3\n  return %1","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"Now we can recreate our foo macro. It's a little more verbose since simple symbols like * are resolved to GlobalRefs in lowered code, but it's broadly the same as our macro.","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"@dynamo function foo(meta)\n  ir = IR(meta)\n  ir = prewalk(ir) do x\n    x isa GlobalRef && x.name == :(*) && return GlobalRef(Base, :+)\n    return x\n  end\n  return ir\nend","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"It behaves identically, too.","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"# Check it works\njulia> @code_ir foo mul(5, 10)\n1:\n  %1 = _2 + _3\n  return %1\n\njulia> foo(mul, 5, 10)\n15\n\njulia> foo() do\n         10*5\n       end\n15\n\njulia> foo() do\n         prod([10, 5])\n       end\n50","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"To get different behaviour we need to go deeper – and talk about recursion.","category":"page"},{"location":"dynamo/#Recursing-1","page":"Dynamo","title":"Recursing","text":"","category":"section"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"A key difference between macros and dynamos is that dynamos get passed functions with they look inside, rather than expressions, so we don't need to write out mul when calling foo(mul, 5, 10).","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"So what if foo actually inserted calls to itself when modifying a function? In other words, prod([1, 2, 3]) would become foo(prod, [1, 2, 3]), and so on for each call inside a function. This lets us get the \"dynamic extent\" property that we talked about earlier.","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"@dynamo function foo2(meta)\n  meta == nothing && return\n  ir = IR(meta)\n  ir = prewalk(ir) do x\n    x isa GlobalRef && x.name == :(*) && return GlobalRef(Base, :+)\n    return x\n  end\n  for (x, st) in ir\n    isexpr(st.expr, :call) || continue\n    ir[x] = xcall(Main, :foo2, st.expr.args...)\n  end\n  return ir\nend","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"There are two changes here: firstly, walking over all IR statements to look for, and modify, call expressions. Secondly we handle the case where meta == nothing, which can happen when we hit things like intrinsic functions for which there is no Julia code. If we return nothing, the dynamo will just run that function as usual.","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"Check it does the transform we wanted:","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"julia> mul_wrapped(a, b) = mul(a, b)\nmul_wrapped (generic function with 1 method)\n\njulia> @code_ir mul_wrapped(5, 10)\n1:\n  %1 = (Main.mul)(_2, _3)\n  return %1\n\njulia> @code_ir foo2 mul_wrapped(5, 10)\n1:\n  %1 = (Main.foo2)(Main.mul, _2, _3)\n  return %1","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"And that it works as expected:","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"julia> foo() do # Does not work (since there is no literal `*` here)\n         mul(5, 10)\n       end\n50\n\njulia> foo2() do # Works correctly\n         mul(5, 10)\n       end\n15\n\njulia> foo2() do\n         prod([5, 10])\n       end\n15","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"This, we have rewritten the prod function to actually calculate sum, by internally rewriting all calls to * to instead use +.","category":"page"},{"location":"dynamo/#","page":"Dynamo","title":"Dynamo","text":"warning: Warning\nA current usability issue with the dynamo is that it is not automatically updated when you redefine functions. For example:julia> @dynamo roundtrip(m) = IR(m)\n\njulia> foo(x) = x^2\nfoo (generic function with 1 method)\n\njulia> roundtrip(foo, 5)\n25\n\njulia> foo(x) = x+1\nfoo (generic function with 1 method)\n\njulia> roundtrip(foo, 5)\n25In order to get the dynamo to see the new definition of foo, you can explicitly call IRTools.refresh():julia> IRTools.refresh(roundtrip)\n\njulia> roundtrip(foo, 5)\n6","category":"page"}]
}
