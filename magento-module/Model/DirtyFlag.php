<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Model;

use Magento\Framework\App\CacheInterface;

class DirtyFlag
{
    private const KEY = 'herqua_products_dirty';

    public function __construct(private readonly CacheInterface $cache) {}

    public function mark(): void
    {
        $this->cache->save('1', self::KEY);
    }

    public function isDirty(): bool
    {
        return (bool)$this->cache->load(self::KEY);
    }

    public function clear(): void
    {
        $this->cache->remove(self::KEY);
    }
}
