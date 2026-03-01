ToDos:
- Theory
    - Ergodicity
    - detailed balance
    - T_c values - [3] stays, add https://arxiv.org/pdf/cond-mat/0502556, remove Kosterlitz reference here (no value was given)

    - correct Wolff algorithm

    - remove Lattice sizes info -> move it to results
    - observables - why X diverges, and C not -> critical exponents
    - critical exponents relation

    - autocorrelation function and time

- Results
    - Setting K_B = 1 and J = 1
    - Temperature dependence: M, X, E, C -> second order phase transition for M - X diverges
    - Comparing Metropolis with Wolff. Autocorrelation times, with roughly the same spin updates per sweep
    - Critical Temperature -> obtain T_c and nu
    - Data collapse -> use obtained T_c und nu to gain gamma

    - exponential fit for autocorrelation times

- discussion
    - Metropolis -> bad curves
    - longer and more measurements to reduce noise

    - finer and wider temperature grid, especially around T_c
    - more lattice sizes
    - optimization CUDA -> parallelization on GPU instead of just multithreading
    - integrating autocorrelation time into data recording