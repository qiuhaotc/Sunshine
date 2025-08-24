# See https://aka.ms/customizecontainer to learn how to customize your debug container.

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Build image
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
# copy csproj and restore as distinct layers (add other project files if more references appear)
COPY ["Sunshine.Server/Sunshine.Server.csproj", "Sunshine.Server/"]
COPY ["Sunshine.Business/Sunshine.Business.csproj", "Sunshine.Business/"]
RUN dotnet restore "Sunshine.Server/Sunshine.Server.csproj"
# copy everything
COPY . .
WORKDIR /src/Sunshine.Server
RUN dotnet build "Sunshine.Server.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Sunshine.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Sunshine.Server.dll"]