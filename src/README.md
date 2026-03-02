# XY Model Simulation om C++
These are command line instructions to compile and run the C++ files. Make sure the current working directory is the root of this repository.
1. Install necessary libraries: `cmake`, `hdf5`
    ```
    sudo pacman -S cmake hdf5
    ```
2. Change directory to `src`, and if not already present, create a new `build` directory
    ```
    cd src
    mkdir build
    ```
3. Compile to executables
    ```
    cd build
    cmake ..
    make
    ```
4. If `main.cpp` changed, remake the executable:
    ```
    make
    ```
5. Still in the `build` directory, run the executable:
    ```
    ./xy-model
    ```

Code base needs to be adjusted accordingly, when trying to simluate the same results as in the report.