#include "XYModel.hpp"
#include <highfive/H5Easy.hpp>
#include <future>
#include <mutex>
#include <iostream>
#include <string>
#include <thread> 

int main() {
    std::cout << "CPU-Cores: " << std::thread::hardware_concurrency() << std::endl;

    H5Easy::File output("../src/data/data.hdf5", H5Easy::File::Overwrite);

    const int N_BURN = 512;
    const int N_STEPS = 512;
    const int N_T = 100;
    const int REPETITIONS = 20;
    const int THREADS_PER_GRID = 8;  // ← 8 Kerne pro Gitter!

    std::vector<double> T(N_T, 0.0);
    std::generate(T.begin(), T.end(), [n = N_T, N_T]() mutable { return 2.0 * n-- / N_T; });
    std::vector<int> gridSizes = {256, 128, 64, 32, 16, 8};
    
    output.createDataSet("/T", T);
    output.createDataSet("/gridSizes", gridSizes);

    std::mutex dataMutex;

    // Data: [grid][rep][temp]
    auto E = std::vector(gridSizes.size(), std::vector(REPETITIONS, std::vector<double>(N_T, 0.0)));
    auto M = std::vector(gridSizes.size(), std::vector(REPETITIONS, std::vector<double>(N_T, 0.0)));
    auto C = std::vector(gridSizes.size(), std::vector(REPETITIONS, std::vector<double>(N_T, 0.0)));
    auto X = std::vector(gridSizes.size(), std::vector(REPETITIONS, std::vector<double>(N_T, 0.0)));

    auto runGrid = [&](const std::string& algoName, int grid_idx, int N) {
        std::cout << "\n=== " << algoName << " N=" << N << " (" << grid_idx+1 << "/6) ===" << std::endl;
        
        std::vector<std::future<void>> futures;
        
        // 20 Reps parallel auf 8 Threads verteilen
        for (int rep = 0; rep < REPETITIONS; rep++) {
            futures.push_back(std::async(std::launch::async, [&](int rep) {
                XYModel xy(N, N);
                xy.initializeData();
                
                for (int t = 0; t < N_T; t++) {
                    xy.T = T[t];
                    
                    // Burn-in
                    for (int i = 0; i < N_BURN; i++) {
                        (algoName == "Wolff") ? xy.Wolff() : xy.Metropolis();
                    }
                    
                    // Sampling
                    double e = 0, m = 0, e2 = 0, m2 = 0;
                    for (int i = 0; i < N_STEPS; i++) {
                        (algoName == "Wolff") ? xy.Wolff() : xy.Metropolis();
                        double _e = xy.Energy();
                        double _m = xy.Magnetization();
                        e += _e / N_STEPS;
                        m += _m / N_STEPS;
                        e2 += _e * _e / N_STEPS;
                        m2 += _m * _m / N_STEPS;
                    }
                    
                    // Thread-safe store
                    {
                        std::lock_guard<std::mutex> lock(dataMutex);
                        E[grid_idx][rep][t] = e;
                        M[grid_idx][rep][t] = m;
                        C[grid_idx][rep][t] = (e2 - e*e) * N*N / (T[t]*T[t]);
                        X[grid_idx][rep][t] = (m2 - m*m) * N*N / T[t];
                    }
                    
                    std::cout << "\r" << algoName << " N=" << N << " rep=" << rep+1 
                              << "/" << REPETITIONS << " T=" << t+1 << "/" << N_T 
                              << "  " << std::flush;
                }
            }, rep));
        }
        
        // Warte auf alle Reps dieses Gitters
        for (auto& f : futures) f.get();
        std::cout << "\nN=" << N << " completed!" << std::endl;
    };

    // Nacheinander: Größtes Gitter zuerst!
    std::cout << "=== WOLFF ===" << std::endl;
    for (int n = 0; n < gridSizes.size(); n++) {
        runGrid("Wolff", n, gridSizes[n]);
    }
    
    std::cout << "\n=== METROPOLIS ===" << std::endl;
    for (int n = 0; n < gridSizes.size(); n++) {
        runGrid("Metropolis", n, gridSizes[n]);
    }

    // Speichern
    {
        std::lock_guard<std::mutex> lock(dataMutex);
        output.createDataSet("/Wolff/E", E);
        output.createDataSet("/Wolff/M", M);
        output.createDataSet("/Wolff/C", C);
        output.createDataSet("/Wolff/X", X);
        output.createDataSet("/Metropolis/E", E);
        output.createDataSet("/Metropolis/M", M);
        output.createDataSet("/Metropolis/C", C);
        output.createDataSet("/Metropolis/X", X);
    }

    std::cout << "\nAll simulations completed!" << std::endl;
    return 0;
}
