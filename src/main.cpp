#include <iostream>
#include <highfive/H5Easy.hpp>
#include <vector>
#include <queue>
#include <random>
#include <cmath>
#include <algorithm>
#include <string>


class XYModel {
private:
  std::mt19937 rng;
  std::uniform_real_distribution<double> rand;
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
  }

private:
  double random() { return rand(rng); }
  double randomAngle() { return random() * 2 * M_PI; }

public:
  void resize(int Nx, int Ny) {
    this->Nx = Ny;
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
      // Attempt to flip Nx*Ny spin in total.
      // If next cluster would exceed it, exit.
    } while (flippedSpins * (1. + 1./i) < Nx*Ny);
  }
};


void printVector(std::vector<double> vec) {
  std::cout << "[ ";
  for (const double& i: vec) {
    std::cout << i << "  ";
  }
  std::cout << "]" << std::endl;
}


int main() {
  const int N = 32;
  XYModel xy(N, N);

  const int N_BURN = 256;
  const int N_STEPS = 1024;
  const int N_T = 201;

  // Actual data used to plot
  auto E = std::vector(N_T, 0.0);
  auto M = std::vector(N_T, 0.0);
  auto C = std::vector(N_T, 0.0);
  auto X = std::vector(N_T, 0.0);
  auto T = std::vector(N_T, 0.0);
  std::generate(T.begin(), T.end(), [n=0, &N_T]() mutable { return 2.0 * n++ / (N_T - 1); });
  
  double _e, _m; // just placeholders, not really important

  for (int i = 0; i < N_T; i++) {
    xy.initializeData(true);
    xy.T = T[i];
    double e=0, m=0, e2=0, m2=0;

    for (int i = 0; i < N_BURN; i++) xy.Metropolis();
  
    for (int i = 0; i < N_STEPS; i++) {
      xy.Wolff();
  
      _e = xy.Energy();
      _m = xy.Magnetization();
  
      e += _e;
      m += _m;
      e2 += _e * _e;
      m2 += _m * _m;
    }
    E[i] = e / N_STEPS;
    M[i] = m / N_STEPS;
    C[i] = (e2 / N_STEPS - e*e/N_STEPS/N_STEPS) * N*N / T[i]/T[i];
    X[i] = (m2 / N_STEPS - m*m/N_STEPS/N_STEPS) * N*N / T[i];

    if ((i-1)%2) {
      std::cout << "\rProgress: " << (100.0 * i/(N_T-1)) << "%" << std::flush;
    }
  }

  H5Easy::File output("../data/data.hdf5", H5Easy::File::Overwrite);
  output.createDataSet("/" + std::to_string(N) + "/T", T);
  output.createDataSet("/" + std::to_string(N) + "/E", E);
  output.createDataSet("/" + std::to_string(N) + "/M", M);
  output.createDataSet("/" + std::to_string(N) + "/C", C);
  output.createDataSet("/" + std::to_string(N) + "/X", X);


  return 0;
}