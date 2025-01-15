# Use Debian Bookworm as a base image
FROM debian:bookworm-slim

# Use root user
USER root
WORKDIR /app

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Update the package list and install minimal utilities
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        git \
        ca-certificates \
        unzip \
        jq \
        bc \
        bash \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install scarb
RUN curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | bash -s -- -v 2.7.1

# Install starkli
RUN curl https://get.starkli.sh | bash
RUN /root/.starkli/bin/starkliup -v 0.3.4

# Install DOJO
RUN curl -L https://install.dojoengine.org | bash
RUN /root/.dojo/bin/dojoup -v 1.0.0-alpha.9

# Copy and set permissions for start script
COPY katana_start.sh /app/katana_start.sh
RUN chmod 755 /app/katana_start.sh

# Set environment variables
ENV STARKNET_RPC="http://127.0.0.1:5050"
ENV STARKLI_NO_PLAIN_KEY_WARNING="true"
ENV STARKNET_ACCOUNT="/app/starkli_account"

# Add katana to PATH
ENV PATH="/root/.dojo/bin:${PATH}"

# Expose port
EXPOSE 5050

# Start katana
CMD ["bash", "/app/katana_start.sh"]
