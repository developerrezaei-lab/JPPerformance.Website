FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY platform/Api/Api.csproj platform/Api/
RUN dotnet restore platform/Api/Api.csproj
COPY platform/Api/ platform/Api/
RUN dotnet publish platform/Api/Api.csproj -c Release -o /out --no-restore -m:1 /p:UseSharedCompilation=false
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .
RUN mkdir -p /app/data /app/keys && chown -R $APP_UID:$APP_UID /app/data /app/keys
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=8s --start-period=30s CMD ["dotnet", "Api.dll", "--healthcheck"]
ENTRYPOINT ["dotnet", "Api.dll"]
