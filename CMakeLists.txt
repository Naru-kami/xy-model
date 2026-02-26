cmake_minimum_required(VERSION 3.20)
project(xy-model)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -march=native")
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(
  HighFive
  GIT_REPOSITORY https://github.com/highfive-devs/highfive.git
  GIT_TAG        v3.1.1   
  GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(HighFive)

find_package(Threads REQUIRED)

# NUR DIESE 2!
add_executable(xy_serial src/main.cpp)
target_link_libraries(xy_serial PRIVATE Threads::Threads HighFive::HighFive)

add_executable(xy_parallel src/main_multithreading.cpp)
target_link_libraries(xy_parallel PRIVATE Threads::Threads HighFive::HighFive)
