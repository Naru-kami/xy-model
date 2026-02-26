#include "XYModel.hpp"

#include <highfive/H5Easy.hpp>   // siehe nächster Abschnitt
#include <future>
#include <vector>
#include <algorithm>             // std::generate
#include <iostream>              // std::cout, std::flush
#include <string>                // std::to_string

int main() {
  const int N = 32;
  const int N_BURN = 256;
  const int N_STEPS = 1024;
  const int N_T = 201;

  std::vector<double> E(N_T, 0.0), M(N_T, 0.0), C(N_T, 0.0), X(N_T, 0.0), T(N_T, 0.0);
  std::generate(T.begin(), T.end(), [n=0, &N_T]() mutable { return 2.0 * n++ / (N_T - 1); });

  // Launch parallel tasks
  std::vector<std::future<void>> futures;

  for (int t = 0; t < N_T; ++t) {
    futures.push_back(std::async(std::launch::async, [&, t]() {
      XYModel xy(N, N, T[t]);
      xy.initializeData(true);

      double e=0, m=0, e2=0, m2=0, _e, _m;

      // Burn-in
      for (int i = 0; i < N_BURN; ++i)
        xy.Metropolis();

      // Sampling
      for (int i = 0; i < N_STEPS; ++i) {
        xy.Wolff();
        _e = xy.Energy();
        _m = xy.Magnetization();
        e += _e;
        m += _m;
        e2 += _e * _e;
        m2 += _m * _m;
      }

      // Store results (thread-safe since each t is unique)
      E[t] = e / N_STEPS;
      M[t] = m / N_STEPS;
      C[t] = (e2 / N_STEPS - e*e/N_STEPS/N_STEPS) * N*N / (T[t]*T[t]);
      X[t] = (m2 / N_STEPS - m*m/N_STEPS/N_STEPS) * N*N / T[t];

      std::cout << "\rProgress: " << (100.0 * t/(N_T-1)) << "%" << std::flush;
    }));
  }

  // Wait for all threads to finish
  for (auto &f : futures) f.get();

  // Write to file after completion (single-threaded)
  H5Easy::File output("../src/data/data.hdf5", H5Easy::File::Overwrite);
  output.createDataSet("/" + std::to_string(N) + "/T", T);
  output.createDataSet("/" + std::to_string(N) + "/E", E);
  output.createDataSet("/" + std::to_string(N) + "/M", M);
  output.createDataSet("/" + std::to_string(N) + "/C", C);
  output.createDataSet("/" + std::to_string(N) + "/X", X);
}
