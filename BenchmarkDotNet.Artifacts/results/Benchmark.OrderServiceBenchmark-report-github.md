```

BenchmarkDotNet v0.13.12, Ubuntu 24.04.4 LTS (Noble Numbat)
Intel Xeon Processor 2.30GHz, 1 CPU, 4 logical and 4 physical cores
.NET SDK 10.0.103
  [Host]     : .NET 8.0.24 (8.0.2426.7010), X64 RyuJIT AVX2
  DefaultJob : .NET 8.0.24 (8.0.2426.7010), X64 RyuJIT AVX2


```
| Method                  | Mean     | Error     | StdDev    | Gen0    | Gen1    | Allocated |
|------------------------ |---------:|----------:|----------:|--------:|--------:|----------:|
| CreateOrderWith500Items | 2.510 ms | 0.0343 ms | 0.0321 ms | 70.3125 | 31.2500 |    1.7 MB |
