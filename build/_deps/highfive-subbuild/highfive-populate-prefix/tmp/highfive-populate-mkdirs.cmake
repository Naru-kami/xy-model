# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.5)

file(MAKE_DIRECTORY
  "/mnt/c/Github_repos/xy-model/build/_deps/highfive-src"
  "/mnt/c/Github_repos/xy-model/build/_deps/highfive-build"
  "/mnt/c/Github_repos/xy-model/build/_deps/highfive-subbuild/highfive-populate-prefix"
  "/mnt/c/Github_repos/xy-model/build/_deps/highfive-subbuild/highfive-populate-prefix/tmp"
  "/mnt/c/Github_repos/xy-model/build/_deps/highfive-subbuild/highfive-populate-prefix/src/highfive-populate-stamp"
  "/mnt/c/Github_repos/xy-model/build/_deps/highfive-subbuild/highfive-populate-prefix/src"
  "/mnt/c/Github_repos/xy-model/build/_deps/highfive-subbuild/highfive-populate-prefix/src/highfive-populate-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/mnt/c/Github_repos/xy-model/build/_deps/highfive-subbuild/highfive-populate-prefix/src/highfive-populate-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/mnt/c/Github_repos/xy-model/build/_deps/highfive-subbuild/highfive-populate-prefix/src/highfive-populate-stamp${cfgdir}") # cfgdir has leading slash
endif()
