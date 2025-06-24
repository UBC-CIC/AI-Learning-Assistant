FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies including C++ compiler
RUN yum -y install postgresql-devel gcc gcc-c++ libpq make

# Copy requirements.txt
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the source code
COPY src/ ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler
CMD [ "main.handler" ]