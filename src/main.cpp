#include <iostream>
#include <highfive/H5Easy.hpp>
#include <vector>
#include <queue>
#include <random>
#include <cmath>
#include <algorithm>
#include <string>

std::vector<double> linspace(double a, double b, int steps) {
  std::vector<double> result(steps, 0.0);
  double step = (b - a) / (steps - 1);
  for (int i = 0; i < steps; i++) {
    result[i] = a + i * step;
  }
  return result;
}

class XYModel {
private:
  std::mt19937 rng;
  std::uniform_real_distribution<double> rand;
  std::uniform_real_distribution<double> randPI;
  int Nx;
  int Ny;

public:
  std::vector<double> spins;
  float T;

  // Class constructor
public:
  XYModel(int Nx, int Ny, float T = 1.0): Nx(Nx), Ny(Ny), T(T) {
    spins = std::vector<double>(Nx * Ny, 0.0);
    std::random_device seed;
    rng = std::mt19937(seed());
    rand = std::uniform_real_distribution(0.0, 1.0);
    randPI = std::uniform_real_distribution(0.0, 2 * M_PI);
  }

private:
  double random() { return rand(rng); }
  double randomAngle() { return randPI(rng); }

public:
  void resize(int Nx, int Ny) {
    this->Nx = Nx;
    this->Ny = Ny;

    spins.resize(Nx * Ny);
    std::fill(spins.begin(), spins.end(), 0.0);
  }

  void initializeData(bool aligned = false) {
    if (aligned) {
      double angle = randomAngle();
      std::fill(spins.begin(), spins.end(), angle);
    } else {
      std::generate(spins.begin(), spins.end(), std::bind(&XYModel::randomAngle, this));
    }
    
  };

  double Magnetization() {
    double sumX=0, sumY=0;
    for (const double& spin: spins) {
      sumX += std::cos(spin);
      sumY += std::sin(spin);
    }
    return std::hypot(sumX, sumY) / Nx/Ny;
  }

  double Energy() {
    double sum = 0;
    for (int y = 0; y < Ny; y++) {
      for (int x = 0; x < Nx; x++) {
        sum -= (
          std::cos(spins[y * Nx + x] - spins[y * Nx + (x + 1) % Nx]) +
          std::cos(spins[y * Nx + x] - spins[((y + 1) % Ny) * Nx + x])
        );
      }
    }
    return sum / Nx/Ny;
  }

  void Metropolis() {
    double energy_now, energy_after, delta;

    for (int y = 0; y < Ny; y++) {
      for (int x = 0; x < Nx; x++) {
        energy_now = -(
          std::cos(spins[y * Nx + x] - spins[y * Nx + ((x + 1) % Nx)]) +
          std::cos(spins[y * Nx + x] - spins[y * Nx + ((x - 1 + Nx) % Nx)]) +
          std::cos(spins[y * Nx + x] - spins[((y + 1) % Ny) * Nx + x]) +
          std::cos(spins[y * Nx + x] - spins[((y - 1 + Ny) % Ny) * Nx + x])
        );

        delta = randomAngle();
        energy_after = -(
          std::cos(spins[y * Nx + x] + delta - spins[y * Nx + ((x + 1) % Nx)]) +
          std::cos(spins[y * Nx + x] + delta - spins[y * Nx + ((x - 1 + Nx) % Nx)]) +
          std::cos(spins[y * Nx + x] + delta - spins[((y + 1) % Ny) * Nx + x]) +
          std::cos(spins[y * Nx + x] + delta - spins[((y - 1 + Ny) % Ny) * Nx + x])
        );

        if (energy_after < energy_now || random() < std::exp(-(energy_after - energy_now) / T)) {
          spins[y * Nx + x] = std::fmod(spins[y * Nx + x] + delta + 2 * M_PI, 2 * M_PI);
        }
      }
    }
  }

  void Wolff() {
    int flippedSpins = 0, i = 0, x, y;
    std::vector<int> neighbors(4, 0);

    do {
      auto r = randomAngle();
      
      std::queue<int> stack;
      std::vector<bool> visited(Nx*Ny, false);
      int clusterSize = 0;

      stack.push(static_cast<int>(random() * Nx*Ny));

      while(!stack.empty()) {
        int s = stack.front();
        stack.pop();

        spins[s] = std::fmod(2*r - spins[s] + 3*M_PI, 2 * M_PI);
        x = s % Nx;
        y = s / Nx;

        neighbors[0] = ((y - 1 + Ny) % Ny) * Nx + x;  // top
        neighbors[1] = y * Nx + ((x + 1) % Nx);       // right
        neighbors[2] = ((y + 1) % Ny) * Nx + x;       // bottom
        neighbors[3] = y * Nx + ((x - 1 + Nx) % Nx);  // left

        for (const auto& neighbor: neighbors) {
          if (
            !visited[neighbor] &&
            (random() < 1 - std::exp(std::min(0.0, 2/T * std::cos(r - spins[s]) * std::cos(r - spins[neighbor]))))
          ) {
            visited[neighbor] = true;
            stack.push(neighbor);
          }
        }
        clusterSize++;
      }

      i++;
      flippedSpins += clusterSize;
      // Attempt to flip Nx*Ny spin in total, in order 
      // to compare to Metropolis, which flips Nx*Ny spins.
      // If next cluster would exceed it, exit.
    } while (flippedSpins * (1. + 1./i) < Nx*Ny);
  }
};

void generateData() {

  H5Easy::File output("../data/data.hdf5", H5Easy::File::Overwrite);

  const int N_BURN = 512;
  const int N_STEPS = 512;
  const int N_T = 100;        // Number of points on the temperature grid.
  const int REPETITIONS = 20; // to calculate mean and std.

  double _e, _m; // just placeholders, not really important
  

  XYModel xy(1, 1);
  
  // Setting temperature grid points
  auto T = linspace(0.02, 2, N_T);
  std::vector<int> gridSizes({256, 128, 64, 32, 16, 8});
  output.createDataSet("/T", T);
  output.createDataSet("/gridSizes", gridSizes);
    
  // Actual data used to plot
  // Observable holds data for grid size, temperature, and repetitions (mean +/- std.)
  std::vector E(gridSizes.size(), std::vector(N_T, std::vector(REPETITIONS, 0.0)));
  std::vector M(gridSizes.size(), std::vector(N_T, std::vector(REPETITIONS, 0.0)));
  std::vector C(gridSizes.size(), std::vector(N_T, std::vector(REPETITIONS, 0.0)));
  std::vector X(gridSizes.size(), std::vector(N_T, std::vector(REPETITIONS, 0.0)));


  // Wolff Algorithm here. Takes about ~4h
  for (int n = 0; n < gridSizes.size(); n++) {
    int N = gridSizes[n];
    xy.resize(N, N);
    
    for (int rep = 0; rep < REPETITIONS; rep++) {
      xy.initializeData();

      for (int i = 0; i < N_T; i++) {
        xy.T = T[i];
        double e=0, m=0, e2=0, m2=0;
    
        for (int i = 0; i < N_BURN; i++) xy.Wolff();
      
        for (int i = 0; i < N_STEPS; i++) {
          xy.Wolff();
      
          _e = xy.Energy();
          _m = xy.Magnetization();
      
          e += _e / N_STEPS;
          m += _m / N_STEPS;
          e2 += _e * _e / N_STEPS;
          m2 += _m * _m / N_STEPS;
        }
        E[n][i][rep] = e;
        M[n][i][rep] = m;
        C[n][i][rep] = (e2 - e*e) * N*N / T[i]/T[i];
        X[n][i][rep] = (m2 - m*m) * N*N / T[i];
    
        std::cout << "\rProgress: Wolff, N=" << N << " - " << (100.0 * (rep*N_T + i + 1)/(REPETITIONS*N_T)) << "%   " << std::flush;
      }
    }
  }

  output.createDataSet("/Wolff/E", E);
  output.createDataSet("/Wolff/M", M);
  output.createDataSet("/Wolff/C", C);
  output.createDataSet("/Wolff/X", X);


  // Use Metropolis now. Takes about ~4h
  E = std::vector(gridSizes.size(), std::vector(N_T, std::vector(REPETITIONS, 0.0)));
  M = std::vector(gridSizes.size(), std::vector(N_T, std::vector(REPETITIONS, 0.0)));
  C = std::vector(gridSizes.size(), std::vector(N_T, std::vector(REPETITIONS, 0.0)));
  X = std::vector(gridSizes.size(), std::vector(N_T, std::vector(REPETITIONS, 0.0)));

  for (int n = 0; n < gridSizes.size(); n++) {
    int N = gridSizes[n];
    xy.resize(N, N);
    
    for (int rep = 0; rep < REPETITIONS; rep++) {
      xy.initializeData();
      
      for (int i = 0; i < N_T; i++) {
        xy.T = T[i];
        double e=0, m=0, e2=0, m2=0;
    
        for (int i = 0; i < N_BURN; i++) xy.Metropolis();
      
        for (int i = 0; i < N_STEPS; i++) {
          xy.Metropolis();
      
          _e = xy.Energy();
          _m = xy.Magnetization();
      
          e += _e / N_STEPS;
          m += _m / N_STEPS;
          e2 += _e * _e / N_STEPS;
          m2 += _m * _m / N_STEPS;
        }
        E[n][i][rep] = e;
        M[n][i][rep] = m;
        C[n][i][rep] = (e2 - e*e) * N*N / T[i]/T[i];
        X[n][i][rep] = (m2 - m*m) * N*N / T[i];
    
        std::cout << "\rProgress: Metropolis, N=" << N << " - " << (100.0 * (rep*N_T + i + 1)/(REPETITIONS*N_T)) << "%   " << std::flush;
      }
    }
  }

  output.createDataSet("/Metropolis/E", E);
  output.createDataSet("/Metropolis/M", M);
  output.createDataSet("/Metropolis/C", C);
  output.createDataSet("/Metropolis/X", X);
};

void generateAutoCorrelationData() {
  H5Easy::File output("../data/ac-times.hdf5", H5Easy::File::Overwrite);

  const int N_BURN = 500;
  const int N_MEAS = 5000;
  const int N_REP = 20; // Average over N_REP

  std::vector<int> gridSizes({8, 16, 32, 64, 128});
  auto T = linspace(0.5, 1.5, 40);

  output.createDataSet("/grid", gridSizes);
  output.createDataSet("/T", T);

  XYModel xy(1, 1);
  
  auto run = [&](bool isWolff){

    std::vector M(N_MEAS, 0.0);
    std::vector C(gridSizes.size(), std::vector(T.size(), std::vector(N_REP, std::vector(N_MEAS, 0.0))));
  
    for (int i = 0; i < gridSizes.size(); i++) {
      int N = gridSizes[i];
      xy.resize(N, N);
  
      for (int j = 0; j < T.size(); j++)  {
      
        for(int h = 0; h < N_REP; h++) {
          xy.T = T[j];
          xy.initializeData(true);
          // configuration needs to be in equilibrium
          for (int k = 0; k < N_BURN; k++) xy.Wolff(); // Wolff for faster burn in
    
          double mean_m = 0.0;
          for (int k = 0; k < N_MEAS; k++) {
            isWolff ? xy.Wolff() : xy.Metropolis();
            M[k] = xy.Magnetization();
            mean_m += M[k] / N_MEAS;
          }
    
          // auto correlation function
          double CX0 = 1;
          auto Gamma = [&](int t) {
            double t_abs = std::abs(t);
            double CXT = 0;
            for (int k = 0; k <= M.size() - t_abs - 1; k++) {
              CXT += (M[k] - mean_m) * (M[k + t_abs] - mean_m);
            }
            CXT /= M.size() - t_abs;
            return CXT / CX0;
          };
          CX0 = Gamma(0);
          
          // auto correlation time
          for(int k = 0; k < M.size()-1; k++) {
            double gamma = Gamma(k);
            if(gamma < std::exp(-3)) break;
            
            C[i][j][h][k] = gamma;
          }
        }
        
        std::cout << "\r Progress N=" << N << ": " << (100.0 * (i * T.size() + j + 1)/(gridSizes.size()*T.size())) << "%" << std::flush;
      }
    }
    if(isWolff) {
      output.createDataSet("/Wolff/C", C);
    } else {
      output.createDataSet("/Metropolis/C", C);
    }
  };
  std::cout << " ==== Wolff Algorithm ==== \n" << std::endl;
  run(true);
  std::cout << " ==== Metropolis Algorithm ==== \n" << std::endl;
  run(false);
  std::cout << "Autocorrelation complete!" << std::endl;
}

int main() {
  // generateAutoCorrelationData();
  // generateData();
  return 0;
}