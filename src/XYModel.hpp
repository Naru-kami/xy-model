#pragma once
#include <iostream>
#include <vector>
#include <queue>
#include <random>
#include <cmath>
#include <algorithm>
#include <functional>

class XYModel {
private:
  std::mt19937 rng;
  std::uniform_real_distribution<double> rand;
  std::uniform_real_distribution<double> randPI;
  int Nx, Ny;

  double random() { return rand(rng); }
  double randomAngle() { return randPI(rng); }

public:
  std::vector<double> spins;
  float T;

  XYModel(int Nx_, int Ny_, float T_ = 1.0) : Nx(Nx_), Ny(Ny_), T(T_) {
    spins = std::vector<double>(Nx * Ny, 0.0);
    std::random_device seed;
    rng = std::mt19937(seed());
    rand = std::uniform_real_distribution<double>(0.0, 1.0);
    randPI = std::uniform_real_distribution<double>(0.0, 2 * M_PI);
  }
    
  void resize(int Nx_, int Ny_) {
    Nx = Nx_;
    Ny = Ny_;
    spins.resize(Nx * Ny, 0.0);
  }
    
  void initializeData(bool aligned = false) {
    if (aligned) {
      double angle = randomAngle();
      std::fill(spins.begin(), spins.end(), angle);
    } else {
      std::generate(spins.begin(), spins.end(), [this]{ return this->randomAngle(); });
    }
  }

  double Magnetization() {
    double sumX = 0, sumY = 0;
    for (const double& spin : spins) {
      sumX += std::cos(spin);
      sumY += std::sin(spin);
    }
    return std::hypot(sumX, sumY) / (Nx * Ny);
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
    return sum / (Nx * Ny);
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
    int flippedSpins = 0, i = 0;
    std::vector<int> neighbors(4, 0);

    do {
      auto r = randomAngle();
      
      std::queue<int> stack;
      std::vector<bool> visited(Nx * Ny, false);
      int clusterSize = 0;

      stack.push(static_cast<int>(random() * Nx * Ny));

      while (!stack.empty()) {
        int s = stack.front();
        stack.pop();

        spins[s] = std::fmod(2 * r - spins[s] + 3 * M_PI, 2 * M_PI);
        int x = s % Nx;
        int y = s / Nx;

        neighbors[0] = ((y - 1 + Ny) % Ny) * Nx + x;  // top
        neighbors[1] = y * Nx + ((x + 1) % Nx);       // right
        neighbors[2] = ((y + 1) % Ny) * Nx + x;       // bottom
        neighbors[3] = y * Nx + ((x - 1 + Nx) % Nx);  // left

        for (const auto& neighbor: neighbors) {
          if (
            !visited[neighbor] &&
            (random() < 1 - std::exp(std::min(0.0, 2 / T * std::cos(r - spins[s]) * std::cos(r - spins[neighbor]))))
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
    } while (flippedSpins * (1. + 1. / i) < Nx * Ny);
  }
};
