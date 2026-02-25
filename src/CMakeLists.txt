cmake_minimum_required(VERSION 3.20)
project(xy-model)


set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -march=native")
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)


include(FetchContent)
FetchContent_Declare( HighFive
  GIT_REPOSITORY https://github.com/highfive-devs/HighFive.git
  GIT_TAG main
  GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(HighFive)


add_executable(xy-model main.cpp)
target_link_libraries(xy-model PRIVATE HighFive)
