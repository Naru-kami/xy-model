#include "XYModel.hpp"
#include <highfive/H5Easy.hpp>
#include <future>
#include <mutex>
#include <iostream>
#include <string>

int main() {
    H5Easy::File output("../src/data/data.hdf5", H5Easy::File::Overwrite);

    const int N_BURN = 256;
    const int N_STEPS = 256;
    const int N_T = 100;
    const int REPETITIONS = 20;

    // Temperature grid
    std::vector<double> T(N_T, 0.0);
    std::generate(T.begin(), T.end(), [n = N_T, N_T]() mutable { return 2.0 * n-- / N_T; });
    std::vector<int> gridSizes = {256, 128, 64, 32, 16, 8};
    
    output.createDataSet("/T", T);
    output.createDataSet("/gridSizes", gridSizes);

    // Data structures for observables [gridSize][temp][repetition]
    auto createData = [&](int size) {
        return std::vector(gridSizes.size(), std::vector(N_T, std::vector<double>(REPETITIONS, 0.0)));
    };

    std::mutex dataMutex;
    auto storeResults = [&](const std::string& path, auto& data) {
        std::lock_guard<std::mutex> lock(dataMutex);
        output.createDataSet(path, data);
    };

    // Helper lambda for simulation
    auto runSimulation = [&](const std::string& algoName, auto&& algorithm) {
        auto E = createData(gridSizes.size());
        auto M = createData(gridSizes.size());
        auto C = createData(gridSizes.size());
        auto X = createData(gridSizes.size());

        // Launch parallel tasks for each grid size
        std::vector<std::future<void>> futures;
        for (int n = 0; n < gridSizes.size(); ++n) {
            int N = gridSizes[n];
            futures.push_back(std::async(std::launch::async, [&, n, N, algoName]() {
                XYModel xy(1, 1);
                
                for (int rep = 0; rep < REPETITIONS; ++rep) {
                    xy.resize(N, N);
                    xy.initializeData();

                    for (int t = 0; t < N_T; ++t) {
                        xy.T = T[t];
                        double e = 0, m = 0, e2 = 0, m2 = 0;

                        // Burn-in
                        for (int i = 0; i < N_BURN; ++i) {
                            algorithm(xy);
                        }

                        // Sampling
                        for (int i = 0; i < N_STEPS; ++i) {
                            algorithm(xy);
                            double _e = xy.Energy();
                            double _m = xy.Magnetization();
                            e += _e / N_STEPS;
                            m += _m / N_STEPS;
                            e2 += _e * _e / N_STEPS;
                            m2 += _m * _m / N_STEPS;
                        }

                        // Store results
                        {
                            std::lock_guard<std::mutex> lock(dataMutex);
                            E[n][t][rep] = e;
                            M[n][t][rep] = m;
                            C[n][t][rep] = (e2 - e * e) * N * N / (T[t] * T[t]);
                            X[n][t][rep] = (m2 - m * m) * N * N / T[t];
                        }

                        std::cout << "\r" << algoName << ", N=" << N 
                                  << ", rep=" << rep+1 << "/" << REPETITIONS 
                                  << ", T=" << t+1 << "/" << N_T 
                                  << ": " << (100.0 * (n * REPETITIONS * N_T + rep * N_T + t + 1) / 
                                             (gridSizes.size() * REPETITIONS * N_T)) << "%" 
                                  << std::flush;
                    }
                }
            }));
        }

        // Wait for completion
        for (auto& f : futures) f.get();

        // Store final results
        storeResults("/" + algoName + "/E", E);
        storeResults("/" + algoName + "/M", M);
        storeResults("/" + algoName + "/C", C);
        storeResults("/" + algoName + "/X", X);

        std::cout << "\n" << algoName << " completed!" << std::endl;
    };

    // Run Wolff algorithm
    std::cout << "Starting Wolff algorithm..." << std::endl;
    runSimulation("Wolff", [](XYModel& xy) { xy.Wolff(); });

    // Run Metropolis algorithm
    std::cout << "\nStarting Metropolis algorithm..." << std::endl;
    runSimulation("Metropolis", [](XYModel& xy) { xy.Metropolis(); });

    std::cout << "\nAll simulations completed!" << std::endl;
    return 0;
}
