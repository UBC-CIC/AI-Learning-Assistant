FROM public.ecr.aws/lambda/python:3.11

# System dependencies (Amazon Linux 2)
RUN yum update -y && \
    yum install -y \
    gcc \
    gcc-c++ \
    make \
    postgresql-devel && \
    yum clean all

# Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Application code
COPY src/ ${LAMBDA_TASK_ROOT}

# Lambda handler
CMD ["main.handler"]