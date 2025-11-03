FROM --platform=linux/amd64 public.ecr.aws/lambda/python:3.11

# Install dependencies, including tesseract and its prerequisites
RUN yum update -y && \
    yum install -y curl gcc gcc-c++ make postgresql-devel libpq tesseract zlib-devel libjpeg-turbo-devel

# Set environment variable for tessdata path
ENV TESSDATA_PREFIX=/usr/share/tessdata

# Download Tesseract English language data
RUN mkdir -p $TESSDATA_PREFIX && \
    curl -L -o $TESSDATA_PREFIX/eng.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata

# Copy requirements and install python packages
COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install --no-cache-dir -r requirements.txt

# Copy the source code
COPY src/ ${LAMBDA_TASK_ROOT}

CMD [ "main.handler" ]