from sqlalchemy import select


class BaseRepo:
    def __init__(self, db, model):
        self.model = model
        self.db = db

    async def get_by_id(self, item_id):
        query = select(self.model).where(self.model.id == item_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self):
        result = await self.db.execute(select(self.model))
        return result.scalars().all()

    async def create(self, item):
        db_item = self.model(**item.model_dump(exclude_unset=True))
        self.db.add(db_item)

        # execute the transaction and returns the id but not permanent
        await self.db.flush()
        await self.db.refresh(db_item)
        return db_item

    async def update(self, db_item, item):
        data = item.model_dump(exclude_unset=True)

        for key, value in data.items():
            setattr(db_item, key, value)

        await self.db.flush()
        await self.db.refresh(db_item)
        return db_item

    async def delete(self, db_item):
        await self.db.delete(db_item)
        await self.db.flush()

        return {"message": "Deleted succesfully"}
