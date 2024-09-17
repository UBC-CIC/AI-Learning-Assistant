# store.py

## Table of Contents <a name="table-of-contents"></a>
- [Script Overview](#script-overview)
  - [Import Libraries](#import-libraries)
  - [Byte Store Architecture](#byte-store-architecture)
  - [Helper Methods](#helper-methods)
  - [Execution Flow](#execution-flow)
- [Detailed Class and Function Descriptions](#detailed-class-and-function-descriptions)
  - [Class: `ByteStore`](#bytestore)
  - [Class: `PostgresByteStore`](#postgresbytestore)
    - [Method: `compute_hash`](#compute_hash)
    - [Method: `serialize_value`](#serialize_value)
    - [Method: `get`](#get)
    - [Method: `set`](#set)
    - [Method: `aget`](#aget)
    - [Method: `aset`](#aset)
    - [Method: `conditional_set`](#conditional_set)
    - [Method: `aconditional_set`](#aconditional_set)

## Script Overview <a name="script-overview"></a>
This script implements a byte-based storage system backed by PostgreSQL. It uses SQLAlchemy for database operations and provides synchronous and asynchronous methods to interact with the database. The key functionality of this script is to store, retrieve, and manage byte data associated with documents, ensuring consistency and efficient updates by using hashing mechanisms.

### Import Libraries <a name="import-libraries"></a>
- **SQLAlchemy**: For database interactions with both synchronous and asynchronous operations.
- **pickle**: For serializing and deserializing Python objects.
- **hashlib**: For generating SHA-256 hashes to ensure data integrity.
- **collections.OrderedDict**: Ensures consistent serialization of Python dictionaries by maintaining the order of keys.
- **BaseStore**: An abstract base class for implementing custom stores.

### Byte Store Architecture <a name="byte-store-architecture"></a>
- **ByteStore**: The SQLAlchemy model that represents the database table. It stores byte data (`LargeBinary`) associated with keys and filenames. The model also stores a hash of the content for efficient updates.
- **PostgresByteStore**: A store that uses the `ByteStore` model for CRUD operations. It provides both synchronous and asynchronous interfaces to store and retrieve byte data. It includes mechanisms to check data consistency using hashes and to update or insert data only when necessary.

### Helper Methods <a name="helper-methods"></a>
- **compute_hash**: Computes the hash of content to determine if changes have occurred.
- **serialize_value**: Serializes the value into a consistent byte format using `pickle` and `OrderedDict`.
- **extract_hashable_content**: Extracts content that should be hashed for comparison, such as the `page_content` from a `Document`.

### Execution Flow <a name="execution-flow"></a>
1. **Data Storage**: The store allows for setting data, and depending on whether the data has changed, it either updates the record or skips the operation.
2. **Data Retrieval**: The store supports synchronous (`get`, `mget`) and asynchronous (`aget`, `amget`) methods for retrieving stored byte data.
3. **Batch Operations**: Methods like `mset`, `amset`, `conditional_set`, and `aconditional_set` allow for efficient batch processing of data, including conditions to avoid unnecessary updates based on hash comparison.

## Detailed Class and Function Descriptions <a name="detailed-class-and-function-descriptions"></a>

### Class: `ByteStore` <a name="bytestore"></a>
```python
class ByteStore(Base):
    __tablename__ = 'bytestore'
    collection_name = Column(String, primary_key=True)
    key = Column(String, primary_key=True)
    value = Column(LargeBinary)
    value_hash = Column(String)  # New field for storing the hash of the value
    filename = Column(String, primary_key=True)  # Include filename as part of the primary key
```
#### Purpose
Defines the structure of the `bytestore` table in PostgreSQL. The table stores:
- `collection_name`: The name of the collection the data belongs to.
- `key`: The key identifying the specific entry.
- `value`: The serialized binary data.
- `value_hash`: The hash of the value used to detect changes.
- `filename`: The associated filename for the entry.

---

### Class: `PostgresByteStore` <a name="postgresbytestore"></a>
```python
class PostgresByteStore(BaseStore):
    def __init__(self, conninfo, collection_name):
        self.conninfo = conninfo
        self.collection_name = collection_name

        # Engines for synchronous and asynchronous operations
        self.engine = create_engine(conninfo)
        self.async_engine = create_async_engine(conninfo)

        # Metadata setup
        Base.metadata.bind = self.engine
        Base.metadata.create_all(self.engine)

        # Session factories for synchronous and asynchronous operations
        self.Session = scoped_session(sessionmaker(bind=self.engine))
        self.async_session_factory = sessionmaker(self.async_engine, class_=AsyncSession, expire_on_commit=False)
```
#### Purpose
Implements a storage system that supports both synchronous and asynchronous database operations. The store uses hash comparison to decide whether to update or insert data, ensuring that unnecessary updates are avoided.

#### Attributes
- **conninfo**: Connection string for the PostgreSQL database.
- **collection_name**: The name of the collection the store manages.
- **engine, async_engine**: Synchronous and asynchronous engines for database interaction.
- **Session, async_session_factory**: Factories for creating synchronous and asynchronous sessions.

---

### Method: `compute_hash` <a name="compute_hash"></a>
```python
def compute_hash(self, content):
    hash_obj = hashlib.sha256(content.encode('utf-8'))
    return hash_obj.hexdigest()
```
#### Purpose
Generates a SHA-256 hash of the content. This is used to check if the data has changed.

#### Process Flow
1. **Encode Content**: The content is first encoded to UTF-8.
2. **Generate Hash**: The SHA-256 hash is computed from the encoded content.
3. **Return Hash**: The computed hash is returned.

#### Inputs and Outputs
- **Inputs**:
  - `content`: The string content to be hashed.
  
- **Outputs**:
  - Returns the SHA-256 hash of the content.

---

### Method: `serialize_value` <a name="serialize_value"></a>
```python
def serialize_value(self, value):
        return pickle.dumps(self.recursive_ordered_dict(value))

def recursive_ordered_dict(self, obj):
    if isinstance(obj, dict):
        return OrderedDict((k, self.recursive_ordered_dict(v)) for k, v in sorted(obj.items()))
    elif isinstance(obj, list):
        return [self.recursive_ordered_dict(v) for v in obj]
    else:
        return obj
```
#### Purpose
Serializes the given value into bytes using `pickle`. The value is first ordered using `OrderedDict` to ensure consistent serialization.

#### Process Flow
1. **Recursively Order the Data**: Converts dictionaries to `OrderedDict` to ensure consistent key order.
2. **Serialize**: Uses `pickle` to serialize the ordered value.
3. **Return Serialized Data**: Returns the serialized byte data.

#### Inputs and Outputs
- **Inputs**:
  - `value`: The value to be serialized.
  
- **Outputs**:
  - Returns the serialized value as bytes.

---

### Method: `get` <a name="get"></a>
```python
def get(self, key):
    with self.Session() as session:
        result = session.execute(select(ByteStore).filter_by(collection_name=self.collection_name, key=key)).scalar()
        return pickle.loads(result.value) if result else None
```
#### Purpose
Retrieves a value from the database using the provided key.

#### Process Flow
1. **Query Database**: Searches for the entry in the database using the `key` and `collection_name`.
2. **Deserialize Value**: If found, deserializes the stored binary data using `pickle`.
3. **Return Value**: Returns the deserialized value or `None` if no entry is found.

#### Inputs and Outputs
- **Inputs**:
  - `key`: The key identifying the entry to retrieve.
  
- **Outputs**:
  - Returns the deserialized value or `None`.

---

### Method: `set` <a name="set"></a>
```python
def set(self, key, value, filename):
    with self.Session() as session:
        serialized_value = self.serialize_value(value)
        hashable_content = self.extract_hashable_content(value)
        entry = ByteStore(collection_name=self.collection_name, key=key, value=serialized_value, value_hash=self.compute_hash(hashable_content), filename=filename)
        session.merge(entry)
        session.commit()
```
#### Purpose
Stores or updates a value in the database with the given key and filename.

#### Process Flow
1. **Serialize Value**: Serializes the `value` using `pickle`.
2. **Compute Hash**: Extracts content from the value and computes its hash.
3. **Insert or Update**: Inserts a new entry if it doesn't exist, or updates the existing one if the content has changed.
4. **Commit Changes**: Commits the transaction to the database.

#### Inputs and Outputs
- **Inputs**:
  - `key`: The key identifying the entry.
  - `value`: The value to be stored.
  - `filename`: The filename associated with the entry.
  
- **Outputs**:
  - No return value.

---

### Method: `aget` <a name="aget"></a>
```python
async def aget(self, key):
    async with self.async_session_factory() as session:
        result = await session.execute(select(ByteStore).filter_by(collection_name=self.collection_name, key=key))
        byte_store = result.scalars().first()
        return pickle.loads(byte_store.value) if byte_store else None
```
#### Purpose
Asynchronously retrieves a value from the database using the provided key.

#### Process Flow
1. **Query Database Asynchronously**: Fetches the entry from the database.
2. **Deserialize Value**: Deserializes the stored binary data using `pickle`.
3. **Return Value**: Returns the deserialized value or `None` if no entry is found.

#### Inputs and Outputs
- **Inputs**:
  - `key`: The key identifying the entry to retrieve.
  
- **Outputs**:
  - Returns the deserialized value or `None`.

---

### Method: `aset` <a name="aset"></a>
```python
async def aset(self, key, value, filename):
    async with self.async_session_factory() as session:
        serialized_value = self.serialize_value(value)
        hashable_content = self.extract_hashable_content(value)
        entry = ByteStore(collection_name=self.collection_name, key=key, value=serialized_value, value_hash=self.compute_hash(hashable_content), filename=filename)
        session.merge(entry)
        await session.commit()
```
#### Purpose
Asynchronously stores or updates a value in the database with the given key and filename.

#### Process Flow
1. **Serialize Value**: Serializes the `value`.
2. **Compute Hash**: Extracts content from the value and computes its hash.
3. **Insert or Update**: Inserts a new entry or updates the existing one asynchronously.
4. **Commit Changes**: Commits the transaction asynchronously.

#### Inputs and Outputs
- **Inputs**:
  - `key`: The key identifying the entry.
  - `value`: The value to be stored.
  - `filename`: The filename associated with the entry.
  
- **Outputs**:
  - No return
